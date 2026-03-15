import type { Task, TaskType } from "@prisma/client";

type TaskWithType = Task & { taskType: TaskType };

const AGENT_LEVEL_ORDER = ["junior", "standard", "senior"];

export function agentLevelRank(level: string): number {
  const idx = AGENT_LEVEL_ORDER.indexOf(level);
  return idx === -1 ? 0 : idx;
}

export function isBusinessHours(now: Date): boolean {
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const hour = et.getHours();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
}

function getHoursUntilBusinessClose(now: Date): number {
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const closeHour = 17;
  return Math.max(0, closeHour - et.getHours() - et.getMinutes() / 60);
}

export function scoreTask(task: TaskWithType, now: Date): number {
  // 1. SLA urgency
  let slaUrgency = 0;
  if (task.slaDeadline) {
    const totalWindow = task.slaDeadline.getTime() - task.createdAt.getTime();
    const remaining = task.slaDeadline.getTime() - now.getTime();
    slaUrgency = Math.max(0, Math.min(1, 1 - remaining / totalWindow));

    // Hard override for near-breach (< 15 min)
    if (remaining < 15 * 60 * 1000 && remaining > 0) return 1000;
    // Already breached — still top priority
    if (remaining <= 0) return 999;
  }

  // 2. Type base priority (normalized 0-1)
  const typePriority = task.taskType.basePriority / 100;

  // 3. Age factor — older tasks float up
  const hoursWaiting = (now.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);
  const ageFactor = Math.min(hoursWaiting / 24, 1);

  // 4. Business hours window closing bonus
  let windowBonus = 0;
  if (task.taskType.requiresBusinessHours && isBusinessHours(now)) {
    const hoursLeft = getHoursUntilBusinessClose(now);
    if (hoursLeft < 2) windowBonus = 1;
    else if (hoursLeft < 4) windowBonus = 0.5;
  }

  // Weighted sum
  const score =
    slaUrgency * 40 +
    typePriority * 30 +
    ageFactor * 20 +
    windowBonus * 10 +
    (task.priorityOverride ?? 0);

  return Math.round(score * 100) / 100;
}

export function isTaskEligibleForAgent(
  task: TaskWithType,
  agentLevel: string,
  agentCapabilities: string[],
  now: Date
): boolean {
  // Check defer
  if (task.deferUntil && task.deferUntil.getTime() > now.getTime()) return false;

  // Check agent level
  const requiredLevel = task.requiredLevel || task.taskType.minAgentLevel;
  if (agentLevelRank(agentLevel) < agentLevelRank(requiredLevel)) return false;

  // Check capability
  if (!agentCapabilities.includes(task.taskTypeSlug)) return false;

  // Suppress business-hours-only tasks outside hours
  if (task.taskType.requiresBusinessHours && !isBusinessHours(now)) return false;

  return true;
}
