-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'standard',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TaskType" (
    "slug" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "basePriority" INTEGER NOT NULL DEFAULT 50,
    "requiresBusinessHours" BOOLEAN NOT NULL DEFAULT false,
    "minAgentLevel" TEXT NOT NULL DEFAULT 'junior',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
    "instructions" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "AgentCapability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "taskTypeSlug" TEXT NOT NULL,
    CONSTRAINT "AgentCapability_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AgentCapability_taskTypeSlug_fkey" FOREIGN KEY ("taskTypeSlug") REFERENCES "TaskType" ("slug") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slaTier" TEXT NOT NULL DEFAULT 'standard'
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskTypeSlug" TEXT NOT NULL,
    "customerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedAgentId" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slaDeadline" DATETIME,
    "assignedAt" DATETIME,
    "completedAt" DATETIME,
    "deferUntil" DATETIME,
    "requiredLevel" TEXT,
    "escalationCount" INTEGER NOT NULL DEFAULT 0,
    "priorityOverride" INTEGER,
    "notes" TEXT,
    CONSTRAINT "Task_taskTypeSlug_fkey" FOREIGN KEY ("taskTypeSlug") REFERENCES "TaskType" ("slug") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "agentId" TEXT,
    "eventType" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaskEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_email_key" ON "Agent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AgentCapability_agentId_taskTypeSlug_key" ON "AgentCapability"("agentId", "taskTypeSlug");

-- CreateIndex
CREATE INDEX "Task_status_deferUntil_idx" ON "Task"("status", "deferUntil");

-- CreateIndex
CREATE INDEX "Task_assignedAgentId_idx" ON "Task"("assignedAgentId");

-- CreateIndex
CREATE INDEX "Task_slaDeadline_idx" ON "Task"("slaDeadline");

-- CreateIndex
CREATE INDEX "TaskEvent_taskId_idx" ON "TaskEvent"("taskId");
