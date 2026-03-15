"use client";

import Link from "next/link";
import {
  Headset,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <h1 className="text-2xl font-bold tracking-tight">TaskFlow</h1>
        <p className="text-sm text-gray-500 mt-0.5">Operations Task Management Demo</p>
      </header>

      <main className="max-w-3xl mx-auto py-12 px-6">
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Welcome to the demo</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Hey and welcome to the demo, there are two sides to it. Agents get their work assigned
            to them and managers get a view of everything. Pick one below and
            poke around.
          </p>
        </div>

        <div className="space-y-4">
          {/* Agent Card */}
          <Link
            href="/agent"
            onMouseEnter={() => setHovered("agent")}
            onMouseLeave={() => setHovered(null)}
            className="block bg-white rounded-2xl border border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                hovered === "agent" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                <Headset className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Agent Workspace</h3>
                  <ArrowRight className={`w-5 h-5 transition-all ${
                    hovered === "agent" ? "text-blue-600 translate-x-1" : "text-gray-300"
                  }`} />
                </div>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                  This is what an operations agent would see day to day. The system picks
                  their next task based on SLA urgency, priority, and how long things have
                  been waiting.
                </p>
              </div>
            </div>
          </Link>

          {/* Manager Card */}
          <Link
            href="/manager"
            onMouseEnter={() => setHovered("manager")}
            onMouseLeave={() => setHovered(null)}
            className="block bg-white rounded-2xl border border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                hovered === "manager" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Manager Dashboard</h3>
                  <ArrowRight className={`w-5 h-5 transition-all ${
                    hovered === "manager" ? "text-blue-600 translate-x-1" : "text-gray-300"
                  }`} />
                </div>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                  This is what a manager would be looking at. They can see how many tasks
                  are in the queue, who&apos;s working on what, how long things are taking, and
                  whether any SLAs are about to blow up. It refreshes live every 30 seconds.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
