"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Headset,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNotifications } from "./NotificationContext";
import { useState, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  hasBadge?: boolean;
  disabled?: boolean;
}[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/agent", label: "Agent Workspace", icon: Headset },
  { href: "/manager", label: "Manager Dashboard", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell, hasBadge: true },
];

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const [logoClicks, setLogoClicks] = useState(0);
  const [wiggling, setWiggling] = useState(false);
  const [showEaster, setShowEaster] = useState(false);

  const logoScale = 1 + logoClicks * 0.12;

  const handleLogoClick = useCallback(() => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    setWiggling(true);
    setTimeout(() => setWiggling(false), 400);

    if (next >= 5) {
      setShowEaster(true);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 },
        colors: ["#111827", "#f97316", "#facc15", "#6b7280", "#ffffff"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { x: 0.3, y: 0.6 },
          colors: ["#111827", "#f97316", "#facc15"],
        });
      }, 300);
      setTimeout(() => {
        setShowEaster(false);
        setLogoClicks(0);
      }, 5000);
    }
  }, [logoClicks]);

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-gray-950 text-white flex flex-col z-40 transition-all duration-200 ${
        collapsed ? "w-[68px]" : "w-[240px]"
      }`}
    >
      {/* Logo */}
      <div
        className="px-4 h-16 flex items-center gap-3 border-b border-white/10 shrink-0 cursor-pointer select-none"
        onClick={handleLogoClick}
      >
        <Image
          src="/dh-logo.png"
          alt="Develop Health"
          width={36}
          height={36}
          className={`rounded-lg shrink-0 transition-transform duration-200 ${wiggling ? "animate-wiggle" : ""}`}
          style={{ transform: `scale(${logoScale})`, "--logo-scale": logoScale } as React.CSSProperties}
        />
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-base font-bold tracking-tight leading-tight">TaskFlow</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest">Develop Health</div>
          </div>
        )}
      </div>

      {/* Easter egg */}
      {showEaster && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
          <div className="fixed top-1/2 left-1/2 animate-scale-in text-center">
            <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 max-w-sm">
              <Image
                src="/dh-logo.png"
                alt="Develop Health"
                width={64}
                height={64}
                className="rounded-xl mx-auto mb-4"
              />
              <p className="text-xl font-bold text-gray-900 mb-2">
                Hey stranger, you found it!
              </p>
              <p className="text-sm text-gray-500">
                Looking forward to speaking with the team soon (:
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const badge = item.hasBadge ? unreadCount : 0;
          return (
            <Link
              key={item.label}
              href={item.disabled ? "#" : item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                item.disabled
                  ? "text-gray-600 cursor-not-allowed"
                  : active
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <div className="relative shrink-0">
                <Icon className="w-[18px] h-[18px]" />
                {badge > 0 && collapsed && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {badge}
                  </span>
                )}
              </div>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center leading-none">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-4 border-t border-white/10 pt-4">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-500 hover:text-white hover:bg-white/5 w-full transition"
        >
          {collapsed ? (
            <ChevronRight className="w-[18px] h-[18px] shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-[18px] h-[18px] shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
