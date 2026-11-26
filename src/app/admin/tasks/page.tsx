"use client";

import { useEffect, useState } from "react";
import { computeStarDistribution } from "@/lib/rating-balancer";
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
  Star,
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
  const [targetRating, setTargetRating] = useState("4.2");
  const [dailyLimit, setDailyLimit] = useState("2");
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
      setMessage({ type: "error", text: "Please fill in all required fields" });
      return;
    }

    try {
      setCreating(true);
      setMessage(null);

      const parsedLimit = parseInt(maxLimit) || 50;
      const parsedTargetRating = parseFloat(targetRating) || 4.2;

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          shopUrl: shopUrl.trim(),
          instructions: instructions.trim(),
          rewardInr: parseFloat(rewardInr) || 10,
          maxLimit: parsedLimit,
          targetRating: parsedTargetRating,
          dailyLimit: parseInt(dailyLimit, 10) || 2,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      setMessage({
        type: "success",
        text: `Task "${data.task.title}" created with limit of ${data.task.maxLimit} and target rating of ${targetRating}★!`,
      });

      // Reset form
      setTitle("");
      setShopUrl("");
      setInstructions("");
      setRewardInr("10");
      setMaxLimit("50");
      setTargetRating("4.2");

      fetchTasks();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error creating task" });
    } finally {
      setCreating(false);
    }
  };

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === "ACTIVE" ? "CLOSED" : "ACTIVE";
    try {
      setActionLoadingId(task.id);
      setMessage(null);
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update task status");
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
      setMessage({
        type: "success",
        text: `Task "${task.title}" is now ${newStatus === "ACTIVE" ? "reopened" : "closed"}.`,
      });
    } catch (err: any) {
      console.error("Failed to toggle status:", err);
      setMessage({ type: "error", text: err.message || "Failed to update status" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete task "${taskTitle}"?`)) return;
    try {
      setActionLoadingId(taskId);
      setMessage(null);
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete task");
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setMessage({
        type: "success",
        text: `Task "${taskTitle}" was deleted successfully.`,
      });
    } catch (err: any) {
      console.error("Failed to delete task:", err);
      setMessage({ type: "error", text: err.message || "Failed to delete task" });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
          <ListTodo className="h-6 w-6 text-blue-600" />
          <span>Shop Listings & Quota Control</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Add new shop review listings, configure custom limits, and set organic star rating distributions.
        </p>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 text-xs font-medium border ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xs hover:underline text-slate-500 hover:text-slate-900 font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Task Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
          <PlusCircle className="h-4 w-4 text-blue-600" />
          <span>Add New Shop Listing</span>
        </h2>

        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 font-mono">
                Business / Shop Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Starbucks Koramangala - Google Maps Review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="futuristic-input w-full rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 font-mono">
                Shop Target URL (Review Link)
              </label>
              <input
                type="url"
                required
                placeholder="https://maps.google.com/?cid=..."
                value={shopUrl}
                onChange={(e) => setShopUrl(e.target.value)}
                className="futuristic-input w-full rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 font-mono">
                Reward Per Review (₹ INR)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={rewardInr}
                onChange={(e) => setRewardInr(e.target.value)}
                className="futuristic-input w-full rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 font-mono">
                Max Limit (Total Reviews)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 50 or 100"
                value={maxLimit}
                onChange={(e) => setMaxLimit(e.target.value)}
                className="futuristic-input w-full rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between font-mono">
                <span>Target Average Rating</span>
                <span className="font-mono text-[11px] text-amber-600 font-bold">★ {targetRating}</span>
              </label>
              <input
                type="number"
                min="3.0"
                max="5.0"
                step="0.1"
                placeholder="e.g. 4.2"
                value={targetRating}
                onChange={(e) => setTargetRating(e.target.value)}
                className="futuristic-input w-full rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder:text-slate-400 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between font-mono">
                <span>Daily Velocity Pacing</span>
                <span className="text-[10px] text-emerald-600 font-bold">Anti-Burst</span>
              </label>
              <select
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="futuristic-input w-full rounded-xl px-3 py-2.5 text-xs text-slate-900 font-semibold"
              >
                <option value="1">1 / day (Ultra-Safe · &lt;50 reviews)</option>
                <option value="2">2 / day (Recommended · 50–150)</option>
                <option value="3">3 / day (Active · 150–200)</option>
                <option value="5">5 / day (High · 200+ reviews)</option>
                <option value="10">10 / day (Aggressive)</option>
              </select>
            </div>
          </div>

          {/* Star Distribution Balancer Preview */}
          {(() => {
            const dist = computeStarDistribution(
              parseInt(maxLimit) || 100,
              parseFloat(targetRating) || 4.2
            );
            return (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-900 font-semibold">
                  <span className="flex items-center gap-1.5 font-mono text-blue-900">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                    <span>Organic Star Distribution (Anti-Filter Shield)</span>
                  </span>
                  <span className="font-mono text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                    Target: {dist.actualAverage}★ Average
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                  <span className="px-3 py-1 rounded-lg bg-white text-slate-800 border border-slate-200 shadow-xs font-bold">
                    {dist.counts[5]} users → 5★
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white text-slate-800 border border-slate-200 shadow-xs font-bold">
                    {dist.counts[4]} users → 4★
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white text-slate-800 border border-slate-200 shadow-xs font-bold">
                    {dist.counts[3]} users → 3★
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 pt-0.5">
                  Assigned deterministically per user slot. When all {dist.total} reviews complete, the overall shop score reaches {dist.actualAverage}★.
                </p>
              </div>
            );
          })()}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 font-mono">
              Review Instructions for Users
            </label>
            <textarea
              required
              rows={3}
              placeholder="1. Open shop link. 2. Post genuine review with assigned star rating. 3. Copy review share link."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="futuristic-input w-full rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="btn-futuristic flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
            All Tasks ({tasks.length})
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Auto-closes as soon as Completed = Max Limit
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono animate-pulse">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono">
            No tasks listed yet. Create your first shop listing above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-mono">
                  <th className="pb-3 font-semibold">Shop Name & URL</th>
                  <th className="pb-3 font-semibold">Reward</th>
                  <th className="pb-3 font-semibold">Progress / Quota</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => {
                  const percent = Math.min(
                    100,
                    Math.round((task.completedCount / task.maxLimit) * 100)
                  );
                  const isClosed = task.status === "CLOSED";

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pr-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {task.title}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-bold">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                            <span>{(task as any).targetRating ? Number((task as any).targetRating).toFixed(1) : "4.5"} Target</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                            <span>Today: {(task as any).todayCompletedCount || 0}/{(task as any).dailyLimit || 2} Drip</span>
                          </span>
                        </div>
                        <a
                          href={task.shopUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline transition-colors font-semibold"
                        >
                          <span>Open link</span>
                          <ExternalLink className="h-3 w-3 text-blue-500" />
                        </a>
                      </td>

                      <td className="py-3.5 font-mono font-bold text-emerald-600">
                        ₹{task.rewardInr}
                      </td>

                      <td className="py-3.5 min-w-[160px]">
                        <div className="flex justify-between text-[11px] text-slate-600 pb-1 font-mono">
                          <span>
                            {task.completedCount} / {task.maxLimit}
                          </span>
                          <span>{percent}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              task.completedCount >= task.maxLimit
                                ? "bg-slate-400"
                                : "bg-gradient-to-r from-blue-600 to-emerald-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold ${
                            isClosed
                              ? "bg-slate-100 text-slate-500 border border-slate-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>

                      <td className="py-3.5 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleToggleStatus(task)}
                          disabled={actionLoadingId === task.id}
                          title={isClosed ? "Reopen task" : "Close task"}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            isClosed
                              ? "border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {actionLoadingId === task.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isClosed ? (
                            <ToggleRight className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <ToggleLeft className="h-3.5 w-3.5 text-slate-500" />
                          )}
                          <span>{isClosed ? "Reopen" : "Close"}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          disabled={actionLoadingId === task.id}
                          title="Delete task"
                          className="inline-flex items-center gap-1 p-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
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
