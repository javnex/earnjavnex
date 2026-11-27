"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import WalletCard from "@/components/WalletCard";
import {
  ListTodo,
  ExternalLink,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Wallet,
  AlertCircle,
  Star,
  Bell,
  Mail,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  shopUrl: string;
  instructions: string;
  rewardInr: number;
  maxLimit: number;
  completedCount: number;
  status: string;
}

interface Submission {
  id: string;
  status: string;
  rewardCredited: number;
  createdAt: string;
  task: {
    title: string;
    shopUrl: string;
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskAlertsEnabled, setTaskAlertsEnabled] = useState(true);
  const [updatingAlerts, setUpdatingAlerts] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [tasksRes, subsRes, prefsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/submissions"),
        fetch("/api/user/preferences"),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }

      if (subsRes.ok) {
        const data = await subsRes.json();
        setRecentSubmissions(data.submissions || []);
      }

      if (prefsRes.ok) {
        const data = await prefsRes.json();
        if (typeof data.task_alerts_enabled === "boolean") {
          setTaskAlertsEnabled(data.task_alerts_enabled);
        }
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlerts = async () => {
    const nextVal = !taskAlertsEnabled;
    setTaskAlertsEnabled(nextVal);
    setUpdatingAlerts(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_alerts_enabled: nextVal }),
      });
      if (!res.ok) {
        // revert on error
        setTaskAlertsEnabled(!nextVal);
      }
    } catch {
      setTaskAlertsEnabled(!nextVal);
    } finally {
      setUpdatingAlerts(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Account Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor your task performance, wallet balance, and instant payout status.
          </p>
        </div>
      </div>

      {/* Top Web Wallet Terminal */}
      <WalletCard />

      {/* Grid: Available Tasks & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Available Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_#2563eb] animate-pulse" />
              <h2 className="text-base font-extrabold tracking-tight text-slate-900 uppercase font-mono">
                Available Shop Listings
              </h2>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-mono font-bold text-blue-700 shadow-xs">
                {tasks.length} Live
              </span>
            </div>
            <Link
              href="/dashboard/tasks"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="glare-card rounded-2xl p-8 text-center text-slate-500 font-mono text-xs animate-pulse">
              Loading available listings...
            </div>
          ) : tasks.length === 0 ? (
            <div className="glare-card rounded-2xl p-8 text-center space-y-2 bg-white border border-slate-200">
              <Sparkles className="h-7 w-7 text-blue-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">
                All Available Tasks Completed
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Log into secondary accounts to complete tasks and pool your ₹10 rewards here using ₹0 internal transfer.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 3).map((task) => {
                const remainingSlots = Math.max(0, task.maxLimit - task.completedCount);
                const percentDone = Math.min(
                  100,
                  Math.round((task.completedCount / task.maxLimit) * 100)
                );

                return (
                  <div
                    key={task.id}
                    className="glare-card rounded-2xl p-5 bg-white border border-slate-200 hover:border-blue-300 transition-all space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {task.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 font-sans">
                          {task.instructions}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 shadow-xs tabular-nums">
                        +₹{task.rewardInr}
                      </span>
                    </div>

                    {/* Progress & Slots left */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-500 tabular-nums">
                        <span>
                          <strong className="text-slate-900">
                            {remainingSlots}
                          </strong>{" "}
                          slots remaining
                        </span>
                        <span>{percentDone}% filled</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all"
                          style={{ width: `${percentDone}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <a
                        href={task.shopUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        <span>Open Shop Link</span>
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </a>
                      <Link
                        href="/dashboard/tasks"
                        className="btn-futuristic px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                      >
                        Complete in 3 Clicks (+₹{task.rewardInr || 20}) →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Multi-Account Pooling Guide & Recent Activity */}
        <div className="space-y-6">
          {/* Quick Guide Card (Trust Blue) */}
          <div className="rounded-2xl p-5 space-y-3.5 border border-blue-200 bg-blue-50/70 shadow-xs">
            <div className="flex items-center gap-2 text-blue-900 text-xs font-bold uppercase tracking-wider font-mono">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>Multi-Account Pooling</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              Each task allows 1 completion per account. If you manage multiple accounts:
            </p>
            <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 font-sans">
              <li>Sign in with Account 2, 3, etc.</li>
              <li>Complete the task on each account.</li>
              <li>
                Transfer rewards to this primary ID with ₹0 fee.
              </li>
              <li>Instantly unlock the ₹100 threshold!</li>
            </ol>
            <Link
              href="/dashboard/transfer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 pt-1 transition-colors"
            >
              <span>Open P2P Transfer</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Recent Task Submissions */}
          <div className="glare-card rounded-2xl p-5 space-y-3.5 border border-slate-200 bg-white">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>Recent Submissions</span>
            </h3>

            {recentSubmissions.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center font-mono">
                No submissions yet. Complete your first task!
              </p>
            ) : (
              <div className="space-y-2.5">
                {recentSubmissions.slice(0, 4).map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="truncate max-w-[170px]">
                      <p className="font-semibold text-slate-900 truncate">
                        {sub.task.title}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                          sub.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : sub.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {sub.status}
                      </span>
                      <span className="font-mono font-black text-emerald-700">
                        +₹{sub.rewardCredited}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Notification Preferences */}
          <div className="glare-card rounded-2xl p-5 space-y-3 border border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600" />
                <span>Task Email Alerts</span>
              </h3>
              <button
                type="button"
                onClick={handleToggleAlerts}
                disabled={updatingAlerts}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  taskAlertsEnabled ? "bg-blue-600" : "bg-slate-200"
                } ${updatingAlerts ? "opacity-50 cursor-wait" : ""}`}
                role="switch"
                aria-checked={taskAlertsEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    taskAlertsEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
              {taskAlertsEnabled
                ? "You will receive email notifications when new tasks and shops are published."
                : "Task alerts are paused. You will not receive emails for new task drops."}
            </p>
          </div>

          {/* DPDP Act 2023 Statutory Data Rights */}
          <div className="glare-card rounded-2xl p-5 space-y-3 border border-slate-200 bg-white">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>Privacy & Data Rights</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
              Exercise your statutory rights under India&apos;s Digital Personal Data Protection Act, 2023.
            </p>
            <div className="flex flex-col gap-2 pt-1 font-mono text-xs">
              <a
                href="/api/user/export-data"
                download
                className="btn-futuristic-glass py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-center text-slate-700 hover:text-blue-600"
              >
                <span>Download My Data (JSON)</span>
              </a>
              <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                <Link href="/privacy" className="hover:text-blue-600 underline">
                  Privacy Notice
                </Link>
                <span>•</span>
                <Link href="/grievance" className="hover:text-blue-600 underline">
                  Grievance Officer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
