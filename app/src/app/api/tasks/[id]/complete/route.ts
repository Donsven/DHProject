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

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.status !== "assigned") {
    return NextResponse.json({ error: "Task is not assigned" }, { status: 400 });
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.task.update({
      where: { id },
      data: {
        status: "completed",
        completedAt: now,
        notes: notes || task.notes,
      },
    }),
    prisma.taskEvent.create({
      data: {
        taskId: id,
        agentId,
        eventType: "completed",
        details: JSON.stringify({ notes }),
      },
    }),
  ]);

  // Keep the demo queue alive
  await spawnDemoTask();

  return NextResponse.json({ success: true });
}
