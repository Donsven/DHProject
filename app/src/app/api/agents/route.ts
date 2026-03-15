import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    include: { capabilities: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(agents);
}
