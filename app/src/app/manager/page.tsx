"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  XOctagon,
  Activity,
  TrendingUp,
  Loader2,
  RefreshCw,
  Phone,
  Printer,
  FileText,
  ClipboardList,
  Shield,
  Timer,
  BarChart3,
} from "lucide-react";

type DashboardData = {
  pending: number;
  assigned: number;
  completedToday: number;
  slaAtRisk: number;
  slaBreached: number;
  byType: {
    displayName: string;
    pending: number;
    avgWaitMin: number;
    slaRisk: number;
  }[];
  agents: {
    id: string;
    name: string;
    level: string;
    currentTask: {
      id: string;
      type: string;
      timeOnTask: number;
    } | null;
  }[];
  recentBreaches: unknown[];
};

const TYPE_ICONS: Record<string, typeof Phone> = {
  "Follow-up Call": Phone,
  "Prescription Transfer Call": Phone,
  "Received Fax Review": Printer,
  "Send Outbound Fax": Printer,
  "Question Set Review": ClipboardList,
  "Internal Quality Review": Shield,
  "Generic Data Labeling": FileText,
};

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full rounded-full bg-gray-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: number | string;
  icon: typeof Clock;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border px-5 py-5 flex items-start gap-4 hover:shadow-sm transition ${
      highlight ? "bg-white border-red-300" : "bg-white border-gray-200"
    }`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
        highlight ? "bg-red-50" : "bg-gray-100"
      }`}>
        <Icon className={`w-5 h-5 ${highlight ? "text-red-600" : "text-gray-600"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs mb-1 ${highlight ? "text-gray-500" : "text-gray-500"}`}>{label}</div>
        <span className={`text-2xl font-bold ${highlight ? "text-red-600" : "text-gray-900"}`}>{value}</span>
      </div>
    </div>
  );
}

export default function ManagerPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    const [res] = await Promise.all([
      fetch("/api/dashboard"),
      new Promise((r) => setTimeout(r, 600)),
    ]);
    const json = await res.json();
    setData(json);
    setLastUpdated(new Date());
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <span className="text-sm">Loading dashboard...</span>
      </div>
    );
  }

  const activeAgents = data.agents.filter((a) => a.currentTask);
  const idleAgents = data.agents.filter((a) => !a.currentTask);
  const maxPending = Math.max(...data.byType.map((t) => t.pending), 1);
  const utilizationPct = data.agents.length > 0
    ? Math.round((activeAgents.length / data.agents.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight">Manager Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-6 space-y-6">
        {/* Top Stats */}
        <div className="grid grid-cols-5 gap-4">
          <StatCard label="Pending Tasks" value={data.pending} icon={Clock} />
          <StatCard label="In Progress" value={data.assigned} icon={Activity} />
          <StatCard label="Completed Today" value={data.completedToday} icon={CheckCircle2} />
          <StatCard
            label="SLA At Risk"
            value={data.slaAtRisk}
            icon={AlertTriangle}
            highlight={data.slaAtRisk > 0}
          />
          <StatCard
            label="SLA Breached"
            value={data.slaBreached}
            icon={XOctagon}
            highlight={data.slaBreached > 0}
          />
        </div>

        {/* Utilization + Queue */}
        <div className="grid grid-cols-3 gap-6">
          {/* Utilization Gauge */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-5">
              <TrendingUp className="w-4 h-4" />
              Agent Utilization
            </h3>
            <div className="flex items-center justify-center">
              <div className="relative w-36 h-36">
                <svg className="w-36 h-36 -rotate-90" viewBox="0 0 144 144">
                  <circle
                    cx="72" cy="72" r="60"
                    fill="none" stroke="currentColor"
                    strokeWidth="12" className="text-gray-100"
                  />
                  <circle
                    cx="72" cy="72" r="60"
                    fill="none" stroke="currentColor"
                    strokeWidth="12"
                    strokeDasharray={`${(utilizationPct / 100) * 377} 377`}
                    strokeLinecap="round"
                    className="text-gray-900"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{utilizationPct}%</span>
                  <span className="text-xs text-gray-400">utilized</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-5 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                <span className="text-gray-600">{activeAgents.length} active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <span className="text-gray-600">{idleAgents.length} idle</span>
              </div>
            </div>
          </div>

          {/* Queue Health */}
          <div className="col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-500">Queue Health by Type</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {data.byType
                .sort((a, b) => b.slaRisk - a.slaRisk || b.pending - a.pending)
                .map((t) => {
                  const Icon = TYPE_ICONS[t.displayName] || FileText;
                  return (
                    <div
                      key={t.displayName}
                      className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{t.displayName}</div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 w-32">
                          <MiniBar value={t.pending} max={maxPending} />
                          <span className="text-gray-600 w-6 text-right font-medium">
                            {t.pending}
                          </span>
                        </div>
                        <div className="w-20 text-right text-gray-500">
                          <div className="flex items-center gap-1 justify-end">
                            <Timer className="w-3 h-3" />
                            {t.avgWaitMin < 60
                              ? `${t.avgWaitMin}m`
                              : `${(t.avgWaitMin / 60).toFixed(1)}h`}
                          </div>
                        </div>
                        <div className="w-16 text-right">
                          {t.slaRisk > 0 ? (
                            <span className="inline-flex items-center gap-1 text-gray-900 font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              {t.slaRisk}
                            </span>
                          ) : (
                            <span className="text-gray-300">0</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Agents Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-500">
                Agents ({data.agents.length})
              </h2>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-gray-700">
                <span className="w-2 h-2 rounded-full bg-gray-900" />
                {activeAgents.length} active
              </span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                {idleAgents.length} idle
              </span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Level</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Current Task</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Time on Task</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.agents
                .sort((a, b) => (a.currentTask ? -1 : 1) - (b.currentTask ? -1 : 1))
                .map((agent) => {
                  const isLong = agent.currentTask && agent.currentTask.timeOnTask > 45;
                  return (
                    <tr key={agent.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                            {agent.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="font-medium">{agent.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">
                          {agent.level}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {agent.currentTask ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-900 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                            Idle
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {agent.currentTask ? (
                          <span className="text-gray-700">{agent.currentTask.type}</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {agent.currentTask ? (
                          <span
                            className={`inline-flex items-center gap-1 ${
                              isLong ? "text-gray-900 font-bold" : "text-gray-600"
                            }`}
                          >
                            {isLong && <AlertTriangle className="w-3 h-3" />}
                            {agent.currentTask.timeOnTask} min
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
