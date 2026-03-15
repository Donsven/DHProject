import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { spawnDemoTask } from "@/lib/demo";

// Failure reason → defer behavior
const DEFER_MAP: Record<string, number | "escalate"> = {
  pbm_closed: 16 * 60 * 60 * 1000, // defer ~16 hours (next business day)
  website_down: 30 * 60 * 1000, // defer 30 min
  illegible_fax: "escalate",
  need_more_info: "escalate",
  other: 0, // re-queue immediately
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { agentId, failureReason, notes } = body;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { taskType: true },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const now = new Date();
  const deferBehavior = DEFER_MAP[failureReason] ?? 0;

  if (deferBehavior === "escalate") {
    // Escalate instead of failing
    const levelOrder = ["junior", "standard", "senior"];
    const currentLevel = task.requiredLevel || task.taskType.minAgentLevel;
    const currentIdx = levelOrder.indexOf(currentLevel);
    const nextLevel = levelOrder[Math.min(currentIdx + 1, levelOrder.length - 1)];

    await prisma.$transaction([
      prisma.task.update({
        where: { id },
        data: {
          status: "pending",
          assignedAgentId: null,
          assignedAt: null,
          requiredLevel: nextLevel,
          escalationCount: { increment: 1 },
          notes: notes || undefined,
        },
      }),
      prisma.taskEvent.create({
        data: {
          taskId: id,
          agentId,
          eventType: "escalated",
          details: JSON.stringify({ failureReason, notes, newLevel: nextLevel }),
        },
      }),
    ]);
  } else {
    const deferUntil =
      deferBehavior > 0 ? new Date(now.getTime() + deferBehavior) : null;

    await prisma.$transaction([
      prisma.task.update({
        where: { id },
        data: {
          status: "pending",
          assignedAgentId: null,
          assignedAt: null,
          deferUntil,
          notes: notes || undefined,
        },
      }),
      prisma.taskEvent.create({
        data: {
          taskId: id,
          agentId,
          eventType: "failed",
          details: JSON.stringify({ failureReason, notes, deferUntil }),
        },
      }),
    ]);
  }

  // Keep the demo queue alive
  await spawnDemoTask();

  return NextResponse.json({ success: true });
}
