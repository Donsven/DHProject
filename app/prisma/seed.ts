import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Wipe everything for a clean slate
  await prisma.taskEvent.deleteMany();
  await prisma.task.deleteMany();
  await prisma.agentCapability.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.taskType.deleteMany();

  // Task Types
  const taskTypes = [
    {
      slug: "follow_up_call",
      displayName: "Follow-up Call",
      basePriority: 70,
      requiresBusinessHours: true,
      minAgentLevel: "standard",
      estimatedMinutes: 20,
      instructions:
        "Call the insurance company to check PA status. Note the reference number and any updates. If on hold >30min, mark as failed with reason.",
    },
    {
      slug: "rx_transfer_call",
      displayName: "Prescription Transfer Call",
      basePriority: 65,
      requiresBusinessHours: true,
      minAgentLevel: "standard",
      estimatedMinutes: 15,
      instructions:
        "Call destination pharmacy to confirm prescription arrived. Verify drug name, dose, and quantity match.",
    },
    {
      slug: "fax_review",
      displayName: "Received Fax Review",
      basePriority: 60,
      requiresBusinessHours: false,
      minAgentLevel: "junior",
      estimatedMinutes: 10,
      instructions:
        "Review the received fax. Determine if it contains a PA approval, denial, or request for more info. Update the PA status accordingly.",
    },
    {
      slug: "outbound_fax",
      displayName: "Send Outbound Fax",
      basePriority: 55,
      requiresBusinessHours: false,
      minAgentLevel: "standard",
      estimatedMinutes: 15,
      instructions:
        "Review and edit the PDF if needed. Look up the correct fax number for the insurance company. Send the fax and confirm delivery.",
    },
    {
      slug: "question_set_review",
      displayName: "Question Set Review",
      basePriority: 30,
      requiresBusinessHours: false,
      minAgentLevel: "junior",
      estimatedMinutes: 10,
      instructions:
        "Review new questions for this drug. Validate each question makes sense and save. Flag any that seem incorrect.",
    },
    {
      slug: "internal_qa",
      displayName: "Internal Quality Review",
      basePriority: 25,
      requiresBusinessHours: false,
      minAgentLevel: "senior",
      estimatedMinutes: 20,
      instructions:
        "Review the prior authorization for completeness, accuracy, and compliance. Note any issues found.",
    },
    {
      slug: "data_labeling",
      displayName: "Generic Data Labeling",
      basePriority: 10,
      requiresBusinessHours: false,
      minAgentLevel: "junior",
      estimatedMinutes: 5,
      instructions:
        "Label the data item according to the provided guidelines. Only work on these when no higher-priority tasks are available.",
    },
  ];

  for (const tt of taskTypes) {
    await prisma.taskType.create({ data: tt });
  }

  // Customers
  const customers = [
    { id: "cust-1", name: "Acme Health", slaTier: "4h" },
    { id: "cust-2", name: "BetaCare", slaTier: "1h" },
    { id: "cust-3", name: "GammaPlan", slaTier: "24h" },
    { id: "cust-4", name: "Delta Insurance", slaTier: "standard" },
    { id: "cust-5", name: "Omega Health", slaTier: "4h" },
  ];

  for (const c of customers) {
    await prisma.customer.create({ data: c });
  }

  // Agents
  const agents = [
    { id: "agent-1", name: "Jane Doe", email: "jane@develophealth.ai", level: "senior" },
    { id: "agent-2", name: "Bob Smith", email: "bob@develophealth.ai", level: "standard" },
    { id: "agent-3", name: "Alice Chen", email: "alice@develophealth.ai", level: "junior" },
  ];

  for (const a of agents) {
    await prisma.agent.create({ data: a });
  }

  // Capabilities — give agents appropriate task types based on level
  const capabilityMap: Record<string, string[]> = {
    "agent-1": ["follow_up_call", "rx_transfer_call", "fax_review", "outbound_fax", "question_set_review", "internal_qa", "data_labeling"],
    "agent-2": ["follow_up_call", "rx_transfer_call", "fax_review", "outbound_fax", "question_set_review", "data_labeling"],
    "agent-3": ["fax_review", "question_set_review", "data_labeling"],
  };

  for (const [agentId, slugs] of Object.entries(capabilityMap)) {
    for (const slug of slugs) {
      await prisma.agentCapability.create({
        data: { agentId, taskTypeSlug: slug },
      });
    }
  }

  // Create sample tasks with varying ages and statuses
  const now = new Date();

  function hoursAgo(h: number): Date {
    return new Date(now.getTime() - h * 60 * 60 * 1000);
  }

  function computeDeadline(createdAt: Date, slaTier: string): Date | null {
    const windows: Record<string, number> = {
      "1h": 3600000,
      "4h": 14400000,
      "24h": 86400000,
      standard: 172800000,
    };
    const w = windows[slaTier];
    return w ? new Date(createdAt.getTime() + w) : null;
  }

  const sampleTasks = [
    // Near SLA breach
    {
      taskTypeSlug: "follow_up_call",
      customerId: "cust-2",
      createdAt: hoursAgo(0.8),
      metadata: JSON.stringify({
        patientName: "Maria Garcia",
        paNumber: "PA-20260313-0012",
        insurance: "UnitedHealth",
        phone: "(800) 555-0199",
        drug: "Humira 40mg",
      }),
    },
    // Standard priority
    {
      taskTypeSlug: "fax_review",
      customerId: "cust-1",
      createdAt: hoursAgo(2),
      metadata: JSON.stringify({
        patientName: "John Smith",
        paNumber: "PA-20260313-0045",
        faxId: "FAX-8821",
        pages: 3,
      }),
    },
    {
      taskTypeSlug: "outbound_fax",
      customerId: "cust-1",
      createdAt: hoursAgo(3),
      metadata: JSON.stringify({
        patientName: "Sarah Johnson",
        paNumber: "PA-20260312-0189",
        insurance: "Cigna",
        faxNumber: "(800) 555-0234",
        drug: "Ozempic 1mg",
      }),
    },
    {
      taskTypeSlug: "follow_up_call",
      customerId: "cust-5",
      createdAt: hoursAgo(3.5),
      metadata: JSON.stringify({
        patientName: "Robert Kim",
        paNumber: "PA-20260312-0201",
        insurance: "Aetna",
        phone: "(800) 555-0167",
        drug: "Dupixent 300mg",
      }),
    },
    {
      taskTypeSlug: "rx_transfer_call",
      customerId: "cust-3",
      createdAt: hoursAgo(5),
      metadata: JSON.stringify({
        patientName: "Emily Davis",
        pharmacy: "CVS #4421 - Main St",
        phone: "(555) 234-5678",
        drug: "Enbrel 50mg",
      }),
    },
    // Low priority tasks
    {
      taskTypeSlug: "question_set_review",
      customerId: null,
      createdAt: hoursAgo(8),
      metadata: JSON.stringify({
        drugName: "Skyrizi",
        questionCount: 12,
      }),
    },
    {
      taskTypeSlug: "internal_qa",
      customerId: "cust-1",
      createdAt: hoursAgo(6),
      metadata: JSON.stringify({
        patientName: "Michael Brown",
        paNumber: "PA-20260311-0098",
        reviewType: "completeness",
      }),
    },
    {
      taskTypeSlug: "data_labeling",
      customerId: null,
      createdAt: hoursAgo(12),
      metadata: JSON.stringify({
        batchId: "BATCH-0045",
        itemCount: 5,
        category: "diagnosis_codes",
      }),
    },
    {
      taskTypeSlug: "data_labeling",
      customerId: null,
      createdAt: hoursAgo(18),
      metadata: JSON.stringify({
        batchId: "BATCH-0044",
        itemCount: 8,
        category: "drug_classification",
      }),
    },
    {
      taskTypeSlug: "fax_review",
      customerId: "cust-5",
      createdAt: hoursAgo(1),
      metadata: JSON.stringify({
        patientName: "Lisa Wong",
        paNumber: "PA-20260313-0067",
        faxId: "FAX-8835",
        pages: 5,
      }),
    },
    // An assigned task (to show in-progress state)
    {
      taskTypeSlug: "follow_up_call",
      customerId: "cust-1",
      status: "assigned",
      assignedAgentId: "agent-1",
      assignedAt: new Date(now.getTime() - 12 * 60 * 1000),
      createdAt: hoursAgo(3),
      metadata: JSON.stringify({
        patientName: "James Wilson",
        paNumber: "PA-20260312-4421",
        insurance: "Aetna",
        phone: "(800) 555-0123",
        drug: "Humira 40mg",
        prescriber: "Dr. Rivera",
      }),
    },
    // Some completed tasks for today stats
    {
      taskTypeSlug: "question_set_review",
      customerId: null,
      status: "completed",
      assignedAgentId: "agent-1",
      assignedAt: hoursAgo(2),
      completedAt: new Date(hoursAgo(2).getTime() + 4 * 60 * 1000),
      createdAt: hoursAgo(10),
      metadata: JSON.stringify({ drugName: "Tremfya", questionCount: 8 }),
    },
    {
      taskTypeSlug: "fax_review",
      customerId: "cust-3",
      status: "completed",
      assignedAgentId: "agent-1",
      assignedAt: hoursAgo(1.5),
      completedAt: new Date(hoursAgo(1.5).getTime() + 7 * 60 * 1000),
      createdAt: hoursAgo(4),
      metadata: JSON.stringify({ patientName: "Tom Hayes", faxId: "FAX-8810", pages: 2 }),
    },
  ];

  for (const t of sampleTasks) {
    const customer = t.customerId
      ? customers.find((c) => c.id === t.customerId)
      : null;
    const slaDeadline = customer
      ? computeDeadline(t.createdAt, customer.slaTier)
      : null;

    await prisma.task.create({
      data: {
        taskTypeSlug: t.taskTypeSlug,
        customerId: t.customerId,
        status: t.status || "pending",
        assignedAgentId: t.assignedAgentId || null,
        metadata: t.metadata,
        createdAt: t.createdAt,
        slaDeadline,
        assignedAt: t.assignedAt || null,
        completedAt: t.completedAt || null,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
