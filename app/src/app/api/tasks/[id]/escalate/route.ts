import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { spawnDemoTask } from "@/lib/demo";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { agentId, notes } = body;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { taskType: true },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const levelOrder = ["junior", "standard", "senior"];
  const currentLevel = task.requiredLevel || task.taskType.minAgentLevel;
  const currentIdx = levelOrder.indexOf(currentLevel);
  const isAlreadyTop = currentIdx >= levelOrder.length - 1;
  const nextLevel = isAlreadyTop
    ? currentLevel
    : levelOrder[currentIdx + 1];

  await prisma.$transaction([
    prisma.task.update({
      where: { id },
      data: {
        status: isAlreadyTop ? "escalated" : "pending",
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
        details: JSON.stringify({
          notes,
          previousLevel: currentLevel,
          newLevel: nextLevel,
          flaggedForManager: isAlreadyTop,
        }),
      },
    }),
  ]);

  // Keep the demo queue alive
  await spawnDemoTask();

  return NextResponse.json({
    success: true,
    flaggedForManager: isAlreadyTop,
  });
}
