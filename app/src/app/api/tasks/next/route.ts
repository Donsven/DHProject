import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scoreTask, isTaskEligibleForAgent } from "@/lib/scoring";

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { capabilities: true },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const agentCapabilities = agent.capabilities.map((c) => c.taskTypeSlug);
  const now = new Date();

  // Get all pending tasks with their task types
  const pendingTasks = await prisma.task.findMany({
    where: {
      status: "pending",
    },
    include: { taskType: true, customer: true },
  });

  // Filter eligible and score
  const eligible = pendingTasks
    .filter((t) => isTaskEligibleForAgent(t, agent.level, agentCapabilities, now))
    .map((t) => ({ ...t, score: scoreTask(t, now) }))
    .sort((a, b) => b.score - a.score);

  if (eligible.length === 0) {
    return NextResponse.json({ task: null, upcoming: [] });
  }

  // Return the top task + preview of next 3
  const topTask = eligible[0];
  const upcoming = eligible.slice(1, 4).map((t) => ({
    id: t.id,
    taskType: t.taskType.displayName,
    customer: t.customer?.name || null,
    slaDeadline: t.slaDeadline,
    score: t.score,
  }));

  return NextResponse.json({ task: topTask, upcoming });
}
