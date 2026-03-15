import { prisma } from "./db";

const SAMPLE_TASKS: { taskTypeSlug: string; customers: (string | null)[]; metadata: Record<string, string | number>[] }[] = [
  {
    taskTypeSlug: "follow_up_call",
    customers: ["cust-1", "cust-2", "cust-5"],
    metadata: [
      { patientName: "Maria Garcia", paNumber: "PA-20260314-0012", insurance: "UnitedHealth", phone: "(800) 555-0199", drug: "Humira 40mg" },
      { patientName: "David Lee", paNumber: "PA-20260314-0088", insurance: "Cigna", phone: "(800) 555-0342", drug: "Ozempic 1mg" },
      { patientName: "Sarah Kim", paNumber: "PA-20260314-0145", insurance: "Aetna", phone: "(800) 555-0167", drug: "Dupixent 300mg" },
      { patientName: "Marcus Brown", paNumber: "PA-20260314-0201", insurance: "BlueCross", phone: "(800) 555-0298", drug: "Stelara 90mg" },
    ],
  },
  {
    taskTypeSlug: "rx_transfer_call",
    customers: ["cust-3", "cust-5"],
    metadata: [
      { patientName: "Emily Davis", pharmacy: "CVS #4421 - Main St", phone: "(555) 234-5678", drug: "Enbrel 50mg" },
      { patientName: "James Wilson", pharmacy: "Walgreens #112 - Oak Ave", phone: "(555) 876-5432", drug: "Tremfya 100mg" },
      { patientName: "Linda Patel", pharmacy: "Rite Aid #88 - Elm Blvd", phone: "(555) 345-6789", drug: "Skyrizi 150mg" },
    ],
  },
  {
    taskTypeSlug: "fax_review",
    customers: ["cust-1", "cust-2", "cust-5"],
    metadata: [
      { patientName: "John Smith", paNumber: "PA-20260314-0045", faxId: "FAX-9001", pages: 3 },
      { patientName: "Lisa Wong", paNumber: "PA-20260314-0067", faxId: "FAX-9015", pages: 5 },
      { patientName: "Robert Chen", paNumber: "PA-20260314-0112", faxId: "FAX-9023", pages: 2 },
    ],
  },
  {
    taskTypeSlug: "outbound_fax",
    customers: ["cust-1", "cust-3"],
    metadata: [
      { patientName: "Sarah Johnson", paNumber: "PA-20260314-0189", insurance: "Cigna", faxNumber: "(800) 555-0234", drug: "Ozempic 1mg" },
      { patientName: "Tom Hayes", paNumber: "PA-20260314-0203", insurance: "Aetna", faxNumber: "(800) 555-0456", drug: "Humira 40mg" },
    ],
  },
  {
    taskTypeSlug: "question_set_review",
    customers: [null],
    metadata: [
      { drugName: "Skyrizi", questionCount: 12 },
      { drugName: "Tremfya", questionCount: 8 },
      { drugName: "Rinvoq", questionCount: 15 },
    ],
  },
  {
    taskTypeSlug: "internal_qa",
    customers: ["cust-1", "cust-3"],
    metadata: [
      { patientName: "Michael Brown", paNumber: "PA-20260314-0098", reviewType: "completeness" },
      { patientName: "Anna Torres", paNumber: "PA-20260314-0134", reviewType: "accuracy" },
    ],
  },
  {
    taskTypeSlug: "data_labeling",
    customers: [null],
    metadata: [
      { batchId: "BATCH-0050", itemCount: 5, category: "diagnosis_codes" },
      { batchId: "BATCH-0051", itemCount: 8, category: "drug_classification" },
      { batchId: "BATCH-0052", itemCount: 3, category: "procedure_codes" },
    ],
  },
];

const SLA_WINDOWS: Record<string, number> = {
  "1h": 3600000,
  "4h": 14400000,
  "24h": 86400000,
  standard: 172800000,
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function spawnDemoTask() {
  const template = pick(SAMPLE_TASKS);
  const customerId = pick(template.customers);
  const metadata = pick(template.metadata);
  const now = new Date();

  // Random age between 10 min and 3 hours so scores vary
  const ageMs = (10 + Math.random() * 170) * 60 * 1000;
  const createdAt = new Date(now.getTime() - ageMs);

  let slaDeadline: Date | null = null;
  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (customer) {
      const window = SLA_WINDOWS[customer.slaTier];
      if (window) slaDeadline = new Date(createdAt.getTime() + window);
    }
  }

  await prisma.task.create({
    data: {
      taskTypeSlug: template.taskTypeSlug,
      customerId,
      metadata: JSON.stringify(metadata),
      createdAt,
      slaDeadline,
    },
  });
}
