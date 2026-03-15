// Map SLA tier to milliseconds
const SLA_WINDOWS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  standard: 48 * 60 * 60 * 1000,
};

export function computeSlaDeadline(
  slaTier: string,
  createdAt: Date
): Date | null {
  const window = SLA_WINDOWS[slaTier];
  if (!window) return null;
  return new Date(createdAt.getTime() + window);
}

export function slaStatus(
  deadline: Date | null,
  now: Date
): "ok" | "at_risk" | "breached" | "none" {
  if (!deadline) return "none";
  const remaining = deadline.getTime() - now.getTime();
  if (remaining <= 0) return "breached";
  if (remaining < 30 * 60 * 1000) return "at_risk";
  return "ok";
}

export function formatTimeRemaining(deadline: Date | null, now: Date): string {
  if (!deadline) return "No SLA";
  const remaining = deadline.getTime() - now.getTime();
  if (remaining <= 0) {
    const overBy = Math.abs(remaining);
    const mins = Math.floor(overBy / 60000);
    if (mins < 60) return `Breached by ${mins}min`;
    return `Breached by ${Math.floor(mins / 60)}h ${mins % 60}min`;
  }
  const mins = Math.floor(remaining / 60000);
  if (mins < 60) return `${mins}min left`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}min left`;
}
