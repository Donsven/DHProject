"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { NotificationProvider } from "./NotificationContext";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <NotificationProvider>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className="min-h-screen transition-all duration-200"
        style={{ paddingLeft: collapsed ? 68 : 240 }}
      >
        {children}
      </div>
    </NotificationProvider>
  );
}
