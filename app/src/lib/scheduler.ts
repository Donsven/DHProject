import cron from "node-cron";
import { prisma } from "./db";

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;

  // Run every minute
  cron.schedule("* * * * *", async () => {
    const now = new Date();

    // 1. Timeout re-queue: tasks assigned >60 min with no activity go back to pending
    const timeoutThreshold = new Date(now.getTime() - 60 * 60 * 1000);
    const timedOut = await prisma.task.findMany({
      where: {
        status: "assigned",
        assignedAt: { lt: timeoutThreshold },
      },
    });

    for (const task of timedOut) {
      await prisma.$transaction([
        prisma.task.update({
          where: { id: task.id },
          data: {
            status: "pending",
            assignedAgentId: null,
            assignedAt: null,
          },
        }),
        prisma.taskEvent.create({
          data: {
            taskId: task.id,
            agentId: task.assignedAgentId,
            eventType: "timeout_requeued",
            details: JSON.stringify({
              assignedAt: task.assignedAt,
              timedOutAt: now.toISOString(),
            }),
          },
        }),
      ]);
    }

    // 2. SLA breach detection: flag tasks that have blown past their deadline
    const breached = await prisma.task.findMany({
      where: {
        status: { in: ["pending", "assigned"] },
        slaDeadline: { lt: now },
      },
    });

    for (const task of breached) {
      // Only log a breach event if we haven't already logged one for this task
      const existingBreach = await prisma.taskEvent.findFirst({
        where: { taskId: task.id, eventType: "sla_breached" },
      });
      if (!existingBreach) {
        await prisma.taskEvent.create({
          data: {
            taskId: task.id,
            eventType: "sla_breached",
            details: JSON.stringify({
              slaDeadline: task.slaDeadline,
              detectedAt: now.toISOString(),
            }),
          },
        });
      }
    }

    if (timedOut.length > 0 || breached.length > 0) {
      console.log(
        `[scheduler] ${timedOut.length} timed out, ${breached.length} SLA breaches detected`
      );
    }
  });

  console.log("[scheduler] Started — running every minute");
}
