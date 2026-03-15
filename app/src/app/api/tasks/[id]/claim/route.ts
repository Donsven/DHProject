import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { agentId } = body;

  const now = new Date();

  // Only claim if still pending (optimistic concurrency)
  const result = await prisma.task.updateMany({
    where: { id, status: "pending" },
    data: {
      status: "assigned",
      assignedAgentId: agentId,
      assignedAt: now,
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Task no longer available" }, { status: 409 });
  }

  await prisma.taskEvent.create({
    data: {
      taskId: id,
      agentId,
      eventType: "assigned",
    },
  });

  return NextResponse.json({ success: true });
}
