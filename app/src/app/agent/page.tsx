"use client";

import { useEffect, useState, useCallback } from "react";
import { formatTimeRemaining, slaStatus } from "@/lib/sla";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  User,
  FileText,
  Phone,
  Printer,
  ClipboardList,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Inbox,
  Sparkles,
  Timer,
  BookOpen,
  MessageSquare,
  Shield,
  Activity,
} from "lucide-react";

type TaskData = {
  id: string;
  taskTypeSlug: string;
  status: string;
  metadata: string;
  createdAt: string;
  slaDeadline: string | null;
  assignedAt: string | null;
  notes: string | null;
  escalationCount: number;
  score: number;
  taskType: {
    slug: string;
    displayName: string;
    instructions: string;
    estimatedMinutes: number;
  };
  customer: { name: string; slaTier: string } | null;
  events?: { eventType: string; details: string; createdAt: string }[];
};

type UpcomingTask = {
  id: string;
  taskType: string;
  customer: string | null;
  slaDeadline: string | null;
  score: number;
};

type Agent = {
  id: string;
  name: string;
  level: string;
};

const FAILURE_REASONS = [
  { value: "pbm_closed", label: "PBM / Insurance phone closed", icon: Phone },
  { value: "website_down", label: "Website / Portal down", icon: Activity },
  { value: "illegible_fax", label: "Illegible or incomplete fax", icon: Printer },
  { value: "need_more_info", label: "Need more information", icon: MessageSquare },
  { value: "other", label: "Other", icon: FileText },
];

const TASK_ICONS: Record<string, typeof Phone> = {
  follow_up_call: Phone,
  prescription_transfer_call: Phone,
  received_fax_review: Printer,
  send_outbound_fax: Printer,
  question_set_review: ClipboardList,
  internal_quality_review: Shield,
  generic_data_labeling: FileText,
};

function SlaGauge({ deadline, now }: { deadline: string; now: Date }) {
  const dl = new Date(deadline);
  const status = slaStatus(dl, now);
  const text = formatTimeRemaining(dl, now);
  const totalMs = dl.getTime() - (dl.getTime() - 4 * 60 * 60 * 1000);
  const remainMs = dl.getTime() - now.getTime();
  const pct = Math.max(0, Math.min(100, (remainMs / totalMs) * 100));

  const isUrgent = status === "breached" || status === "at_risk";

  return (
    <div className={`${isUrgent ? "bg-gray-900" : "bg-gray-100"} rounded-xl p-4 flex items-center gap-4`}>
      <div className="relative w-14 h-14 shrink-0">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          <circle
            cx="28" cy="28" r="24"
            fill="none" stroke="currentColor"
            strokeWidth="4" className={isUrgent ? "text-gray-700" : "text-gray-300"}
          />
          <circle
            cx="28" cy="28" r="24"
            fill="none" stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${(pct / 100) * 150.8} 150.8`}
            strokeLinecap="round"
            className={isUrgent ? "text-white" : "text-gray-900"}
          />
        </svg>
        <Clock className={`w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isUrgent ? "text-white" : "text-gray-600"}`} />
      </div>
      <div>
        <div className={`text-lg font-bold ${isUrgent ? "text-white" : "text-gray-900"}`}>{text}</div>
        <div className={`text-xs ${isUrgent ? "text-gray-400" : "text-gray-500"}`}>SLA Deadline</div>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const isCritical = score >= 100;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
      isCritical ? "bg-gray-900 text-white border-gray-900" : "bg-gray-100 text-gray-700 border-gray-200"
    }`}>
      <Sparkles className="w-3 h-3" />
      {score.toFixed(1)}
    </span>
  );
}

export default function AgentPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [currentTask, setCurrentTask] = useState<TaskData | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingTask[]>([]);
  const [completedToday, setCompletedToday] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);
  const [failReason, setFailReason] = useState("pbm_closed");
  const [taskNotes, setTaskNotes] = useState("");
  const [now, setNow] = useState(new Date());
  const [confirmAction, setConfirmAction] = useState<{ type: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        setAgents(data);
        if (data.length > 0) setSelectedAgentId(data[0].id);
      });
  }, []);

  const fetchNextTask = useCallback(async () => {
    if (!selectedAgentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/next?agentId=${selectedAgentId}`);
      const data = await res.json();
      setCurrentTask(data.task);
      setUpcoming(data.upcoming || []);
      setTaskNotes("");
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    fetchNextTask();
  }, [fetchNextTask]);

  const claimAndShow = async (task: TaskData) => {
    await fetch(`/api/tasks/${task.id}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: selectedAgentId }),
    });
    setCurrentTask({ ...task, status: "assigned", assignedAt: new Date().toISOString() });
  };

  const completeTask = async () => {
    if (!currentTask) return;
    await fetch(`/api/tasks/${currentTask.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: selectedAgentId, notes: taskNotes }),
    });
    setCompletedToday((c) => c + 1);
    fetchNextTask();
  };

  const failTask = async () => {
    if (!currentTask) return;
    await fetch(`/api/tasks/${currentTask.id}/fail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: selectedAgentId,
        failureReason: failReason,
        notes: taskNotes,
      }),
    });
    setShowFailModal(false);
    fetchNextTask();
  };

  const escalateTask = async () => {
    if (!currentTask) return;
    await fetch(`/api/tasks/${currentTask.id}/escalate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: selectedAgentId, notes: taskNotes }),
    });
    fetchNextTask();
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const meta = currentTask
    ? typeof currentTask.metadata === "string"
      ? JSON.parse(currentTask.metadata)
      : currentTask.metadata
    : {};

  const TaskIcon = currentTask ? (TASK_ICONS[currentTask.taskTypeSlug] || FileText) : FileText;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight">Agent Workspace</h1>
          <div className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {completedToday} done today
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold">
              {selectedAgent?.name?.split(" ").map((n) => n[0]).join("") || "?"}
            </div>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer pr-2"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.level})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="flex">
        <main className="flex-1 max-w-4xl mx-auto py-8 px-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <span className="text-sm">Finding your next task...</span>
            </div>
          ) : !currentTask ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-20 h-20 rounded-2xl bg-gray-200 flex items-center justify-center mb-4">
                <Inbox className="w-10 h-10 text-gray-400" />
              </div>
              <div className="text-xl font-semibold text-gray-400 mb-1">Queue is clear</div>
              <p className="text-gray-400 text-sm">No tasks match your capabilities right now.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Task Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Task Header */}
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                        <TaskIcon className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold">
                            {currentTask.taskType.displayName}
                          </h2>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          {currentTask.customer && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {currentTask.customer.name}
                            </span>
                          )}
                          {currentTask.customer && (
                            <span className="text-gray-300">|</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5" />
                            ~{currentTask.taskType.estimatedMinutes} min
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className="font-mono text-xs text-gray-400">
                            {currentTask.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {currentTask.status === "assigned" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-900 text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        In Progress
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {/* SLA Gauge */}
                  {currentTask.slaDeadline && (
                    <SlaGauge deadline={currentTask.slaDeadline} now={now} />
                  )}

                  {/* Escalation warning */}
                  {currentTask.escalationCount > 0 && (
                    <div className="flex items-center gap-3 bg-gray-100 border border-gray-200 rounded-xl p-4">
                      <AlertTriangle className="w-5 h-5 text-gray-600 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          Escalated {currentTask.escalationCount}x
                        </div>
                        <div className="text-xs text-gray-500">
                          This task has been escalated. Please handle with care.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      <FileText className="w-3.5 h-3.5" />
                      Task Details
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(meta).map(([key, value]) => (
                          <div key={key} className="flex flex-col">
                            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      <BookOpen className="w-3.5 h-3.5" />
                      Instructions
                    </h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {currentTask.taskType.instructions}
                      </p>
                    </div>
                  </div>

                  {/* Event History */}
                  {currentTask.events && currentTask.events.length > 0 && (
                    <div>
                      <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        <Activity className="w-3.5 h-3.5" />
                        History
                      </h3>
                      <div className="space-y-2">
                        {currentTask.events.map((ev, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 text-sm bg-gray-50 rounded-lg px-4 py-2.5"
                          >
                            <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                            <span className="text-gray-500 font-mono text-xs">
                              {new Date(ev.createdAt).toLocaleString([], {
                                month: "numeric",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="text-gray-700 capitalize">
                              {ev.eventType.replace(/_/g, " ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Notes
                    </h3>
                    <textarea
                      value={taskNotes}
                      onChange={(e) => setTaskNotes(e.target.value)}
                      placeholder="Add notes about this task..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
                  {currentTask.status === "pending" ? (
                    <button
                      onClick={() => setConfirmAction({ type: "Claim this task?", onConfirm: () => { claimAndShow(currentTask); setConfirmAction(null); } })}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Claim Task
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirmAction({ type: "Mark this task as complete?", onConfirm: () => { completeTask(); setConfirmAction(null); } })}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Complete
                      </button>
                      <button
                        onClick={() => setShowFailModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition border border-gray-300 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        Can&apos;t Complete
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: "Escalate this task to a higher-level agent?", onConfirm: () => { escalateTask(); setConfirmAction(null); } })}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition border border-gray-300 cursor-pointer"
                      >
                        <ArrowUpCircle className="w-4 h-4" />
                        Escalate
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Up Next Queue */}
              {upcoming.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Up Next in Queue
                  </h3>
                  <div className="space-y-2">
                    {upcoming.map((t) => {
                      const UpIcon = TASK_ICONS[t.taskType.toLowerCase().replace(/ /g, "_")] || FileText;
                      return (
                        <div
                          key={t.id}
                          className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 flex items-center justify-between hover:border-gray-300 transition"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                              <UpIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{t.taskType}</span>
                                {t.customer && (
                                  <span className="text-xs text-gray-400">· {t.customer}</span>
                                )}
                              </div>
                              {t.slaDeadline && (
                                <span className="text-xs text-gray-500">
                                  {formatTimeRemaining(new Date(t.slaDeadline), now)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Failure Reason Modal */}
      {showFailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Can&apos;t Complete Task</h3>
                <p className="text-xs text-gray-500">Select the reason. This determines re-queue behavior.</p>
              </div>
            </div>
            <div className="space-y-2 mb-5">
              {FAILURE_REASONS.map((r) => {
                const Icon = r.icon;
                return (
                  <label
                    key={r.value}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                      failReason === r.value
                        ? "border-gray-900 bg-gray-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="failReason"
                      value={r.value}
                      checked={failReason === r.value}
                      onChange={(e) => setFailReason(e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        failReason === r.value ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{r.label}</span>
                    {failReason === r.value && (
                      <CheckCircle2 className="w-4 h-4 text-gray-900 ml-auto" />
                    )}
                  </label>
                );
              })}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowFailModal(false)}
                className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 font-medium transition rounded-xl hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={failTask}
                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-black transition shadow-sm"
              >
                Submit Reason
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-2">Are you sure?</h3>
            <p className="text-sm text-gray-500 mb-6">{confirmAction.type}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 font-medium transition rounded-xl hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction.onConfirm}
                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-black transition shadow-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
