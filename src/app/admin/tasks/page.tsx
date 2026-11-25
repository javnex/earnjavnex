"use client";

import { useEffect, useState } from "react";
import {
  ListTodo,
  PlusCircle,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Edit,
  Sparkles,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  shopUrl: string;
  instructions: string;
  rewardInr: number;
  maxLimit: number;
  completedCount: number;
  status: "ACTIVE" | "CLOSED";
  createdAt: string;
  _count?: { submissions: number };
}

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [shopUrl, setShopUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [rewardInr, setRewardInr] = useState("10");
  const [maxLimit, setMaxLimit] = useState("50");
  const [creating, setCreating] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tasks?all=true");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !shopUrl || !instructions) {
      setMessage({ type: "error", text: "Please fill in all task fields." });
      return;
    }

    try {
      setCreating(true);
      setMessage(null);

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          shopUrl: shopUrl.trim(),
          instructions: instructions.trim(),
          rewardInr: parseFloat(rewardInr) || 10,
          maxLimit: parseInt(maxLimit) || 50,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      setMessage({
        type: "success",
        text: `Task "${data.task.title}" created with review limit of ${data.task.maxLimit}!`,
      });

      // Reset form
      setTitle("");
      setShopUrl("");
      setInstructions("");
      setRewardInr("10");
      setMaxLimit("50");

      fetchTasks();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error creating task" });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === "ACTIVE" ? "CLOSED" : "ACTIVE";
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <ListTodo className="h-6 w-6 text-violet-400" />
          <span>Create & Manage Shop Tasks</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Add new shop review listings, configure custom max limits, and control task auto-closing rules.
        </p>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-xl p-4 text-sm font-medium border ${
            message.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/60 border-rose-500/40 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xs hover:underline text-slate-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Task Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-violet-400" />
          <span>Add New Shop Listing</span>
        </h2>

        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Business / Shop Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Starbucks Koramangala - Google Maps Review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Shop Target URL (Review Link)
              </label>
              <input
                type="url"
                required
                placeholder="https://maps.google.com/?cid=..."
                value={shopUrl}
                onChange={(e) => setShopUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Reward Per Review (₹ INR)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={rewardInr}
                onChange={(e) => setRewardInr(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Max Review Limit (Auto-Closes Platform-Wide at Limit)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 50 or 100"
                value={maxLimit}
                onChange={(e) => setMaxLimit(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Review Instructions for Users
            </label>
            <textarea
              required
              rows={3}
              placeholder="1. Open shop link. 2. Post genuine 5-star review. 3. Copy review share URL and paste back."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Task...</span>
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4" />
                <span>Publish Shop Task Listing</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Task Management Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-base font-bold text-white">
            All Tasks ({tasks.length})
          </h2>
          <span className="text-xs text-slate-400">
            Auto-closes as soon as Completed = Max Limit
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No tasks listed yet. Create your first shop listing above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Shop Name & URL</th>
                  <th className="pb-3 font-semibold">Reward</th>
                  <th className="pb-3 font-semibold">Progress / Quota</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tasks.map((task) => {
                  const percent = Math.min(
                    100,
                    Math.round((task.completedCount / task.maxLimit) * 100)
                  );
                  const isClosed = task.status === "CLOSED";

                  return (
                    <tr key={task.id} className="hover:bg-slate-850/50">
                      <td className="py-3.5 pr-4 space-y-1">
                        <div className="font-semibold text-white">
                          {task.title}
                        </div>
                        <a
                          href={task.shopUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-violet-400 hover:underline"
                        >
                          <span>Open link</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>

                      <td className="py-3.5 font-bold text-emerald-400">
                        ₹{task.rewardInr}
                      </td>

                      <td className="py-3.5 min-w-[160px]">
                        <div className="flex justify-between text-[11px] text-slate-300 pb-1 font-mono">
                          <span>
                            {task.completedCount} / {task.maxLimit}
                          </span>
                          <span>{percent}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              task.completedCount >= task.maxLimit
                                ? "bg-rose-500"
                                : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isClosed
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>

                      <td className="py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleToggleStatus(task)}
                          title={isClosed ? "Reopen task" : "Close task"}
                          className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                        >
                          {isClosed ? "Reopen" : "Close"}
                        </button>

                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          title="Delete task"
                          className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
