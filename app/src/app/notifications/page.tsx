"use client";

import { useState, useEffect } from "react";
import { useNotifications } from "@/components/NotificationContext";
import {
  AlertTriangle,
  CheckCircle2,
  ArrowUpCircle,
  Clock,
  Info,
} from "lucide-react";

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    icon: AlertTriangle,
    title: "SLA Breached",
    message: "Follow-up Call for Acme Health breached by 12 min. 3 failed call attempts due to PBM hold times.",
    time: "8 min ago",
    unread: true,
  },
  {
    id: 2,
    icon: ArrowUpCircle,
    title: "Task Escalated",
    message: "Received Fax Review escalated to senior. Illegible fax from BetaCare, needs manual review.",
    time: "23 min ago",
    unread: true,
  },
  {
    id: 3,
    icon: Clock,
    title: "Task Timed Out",
    message: "Outbound Fax assigned to Bob Smith returned to queue after 60 min with no activity.",
    time: "1 hr ago",
    unread: true,
  },
  {
    id: 4,
    icon: CheckCircle2,
    title: "Batch Complete",
    message: "Alice Chen completed 8 data labeling tasks in BATCH-0044.",
    time: "2 hrs ago",
    unread: false,
  },
  {
    id: 5,
    icon: Info,
    title: "New Task Type Added",
    message: "\"Appeal Letter Review\" has been added as a task type by a manager. 0 agents have this capability so far.",
    time: "3 hrs ago",
    unread: false,
  },
  {
    id: 6,
    icon: AlertTriangle,
    title: "SLA At Risk",
    message: "Prescription Transfer Call for Omega Health has 14 min remaining and is currently unassigned.",
    time: "4 hrs ago",
    unread: false,
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const unreadCount = notifications.filter((n) => n.unread).length;
  const { setUnreadCount } = useNotifications();

  useEffect(() => {
    setUnreadCount(unreadCount);
  }, [unreadCount, setUnreadCount]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-900 text-white">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-gray-500 hover:text-gray-900 font-medium"
          >
            Mark all as read
          </button>
        )}
      </header>

      <main className="max-w-3xl mx-auto py-8 px-6">
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon = n.icon;
            return (
              <div
                key={n.id}
                className={`bg-white rounded-xl border px-5 py-4 flex items-start gap-4 transition hover:shadow-sm ${
                  n.unread
                    ? "border-gray-400 shadow-sm"
                    : "border-gray-200"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{n.title}</span>
                    {n.unread && (
                      <span className="w-2 h-2 rounded-full bg-gray-900" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">
                    {n.message}
                  </p>
                  <span className="text-xs text-gray-400 mt-1.5 block">
                    {n.time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8 text-sm text-gray-400">
          Showing recent notifications from the last 24 hours
        </div>
      </main>
    </div>
  );
}
