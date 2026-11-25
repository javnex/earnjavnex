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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [tasksRes, subsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/submissions"),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }

      if (subsRes.ok) {
        const data = await subsRes.json();
        setRecentSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Web Wallet Card */}
      <WalletCard />

      {/* Grid: Available Tasks & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Available Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Available Tasks</h2>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                {tasks.length} Live
              </span>
            </div>
            <Link
              href="/dashboard/tasks"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400 animate-pulse">
              Loading available tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center space-y-2">
              <Sparkles className="h-8 w-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">
                You have completed all available tasks!
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Remember: you can log into your other Google accounts to complete tasks and transfer your ₹10 rewards here using ₹0-fee internal transfer.
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
                    className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
                          {task.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                          {task.instructions}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                        +₹{task.rewardInr}
                      </span>
                    </div>

                    {/* Progress & Slots left */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>
                          <strong className="text-slate-200">
                            {remainingSlots}
                          </strong>{" "}
                          slots remaining
                        </span>
                        <span>{percentDone}% filled</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                          style={{ width: `${percentDone}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <a
                        href={task.shopUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white"
                      >
                        <span>Open Shop Link</span>
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </a>
                      <Link
                        href="/dashboard/tasks"
                        className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                      >
                        Submit Review Proof →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Activity & Multi-Account Pooling Guide */}
        <div className="space-y-6">
          {/* Quick Guide Card */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-cyan-950/20 p-5 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold">
              <ArrowRightLeft className="h-4 w-4" />
              <span>How To Reach ₹100 Faster</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Only 1 review is allowed per Google account for each shop. If you have 2 or more Google accounts:
            </p>
            <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 font-sans">
              <li>Log in with Account 2, 3, etc.</li>
              <li>Complete the shop review on each ID.</li>
              <li>
                Transfer the ₹10 to this primary ID using ₹0-fee internal transfer.
              </li>
              <li>Cash out ₹100 in instant USDT to your Polygon wallet!</li>
            </ol>
            <Link
              href="/dashboard/transfer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:underline pt-1"
            >
              <span>Go to P2P Transfer</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Recent Reviews Submitted */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>My Recent Submissions</span>
            </h3>

            {recentSubmissions.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                No submissions yet. Complete your first task!
              </p>
            ) : (
              <div className="space-y-2.5">
                {recentSubmissions.slice(0, 4).map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/60 last:border-0"
                  >
                    <div className="truncate max-w-[170px]">
                      <p className="font-medium text-slate-200 truncate">
                        {sub.task.title}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          sub.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : sub.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {sub.status}
                      </span>
                      <span className="font-bold text-emerald-400">
                        +₹{sub.rewardCredited}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
