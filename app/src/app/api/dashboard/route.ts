import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Queue stats
  const [pendingTasks, assignedTasks, completedToday, allAgents] =
    await Promise.all([
      prisma.task.findMany({
        where: { status: "pending" },
        include: { taskType: true, customer: true },
      }),
      prisma.task.findMany({
        where: { status: "assigned" },
        include: { taskType: true, customer: true, assignedAgent: true },
      }),
      prisma.task.findMany({
        where: {
          status: "completed",
          completedAt: { gte: todayStart },
        },
        include: { taskType: true, assignedAgent: true },
      }),
      prisma.agent.findMany({
        where: { isActive: true },
      }),
    ]);

  // SLA stats
  const slaAtRisk = pendingTasks.filter((t) => {
    if (!t.slaDeadline) return false;
    const remaining = t.slaDeadline.getTime() - now.getTime();
    return remaining > 0 && remaining < 30 * 60 * 1000;
  }).length;

  const slaBreached = pendingTasks.filter((t) => {
    if (!t.slaDeadline) return false;
    return t.slaDeadline.getTime() <= now.getTime();
  }).length;

  // By task type
  const byType: Record<
    string,
    { displayName: string; pending: number; avgWaitMin: number; slaRisk: number }
  > = {};

  for (const t of pendingTasks) {
    if (!byType[t.taskTypeSlug]) {
      byType[t.taskTypeSlug] = {
        displayName: t.taskType.displayName,
        pending: 0,
        avgWaitMin: 0,
        slaRisk: 0,
      };
    }
    const entry = byType[t.taskTypeSlug];
    entry.pending++;
    entry.avgWaitMin +=
      (now.getTime() - t.createdAt.getTime()) / 60000;
    if (
      t.slaDeadline &&
      t.slaDeadline.getTime() - now.getTime() < 30 * 60 * 1000
    ) {
      entry.slaRisk++;
    }
  }

  // Compute averages
  for (const key of Object.keys(byType)) {
    if (byType[key].pending > 0) {
      byType[key].avgWaitMin = Math.round(
        byType[key].avgWaitMin / byType[key].pending
      );
    }
  }

  // Active agents with current task
  const activeAgents = allAgents.map((agent) => {
    const currentTask = assignedTasks.find(
      (t) => t.assignedAgentId === agent.id
    );
    return {
      id: agent.id,
      name: agent.name,
      level: agent.level,
      currentTask: currentTask
        ? {
            id: currentTask.id,
            type: currentTask.taskType.displayName,
            timeOnTask: currentTask.assignedAt
              ? Math.round(
                  (now.getTime() - currentTask.assignedAt.getTime()) / 60000
                )
              : 0,
          }
        : null,
    };
  });

  // Recent SLA breaches (completed or still pending)
  const recentBreaches = await prisma.taskEvent.findMany({
    where: {
      eventType: "sla_breached",
      createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    include: { task: { include: { taskType: true, customer: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    pending: pendingTasks.length,
    assigned: assignedTasks.length,
    completedToday: completedToday.length,
    slaAtRisk,
    slaBreached,
    byType: Object.values(byType),
    agents: activeAgents,
    recentBreaches,
  });
}
