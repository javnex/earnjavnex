"use client";

import { useEffect, useState } from "react";
import {
  CheckSquare,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Filter,
} from "lucide-react";

interface Submission {
  id: string;
  proofLink: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rewardCredited: number;
  adminNotes?: string;
  createdAt: string;
  task: {
    title: string;
    shopUrl: string;
    rewardInr: number;
  };
  user: {
    name?: string;
    email: string;
    userCode: string;
  };
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  // Mode Setting
  const [verificationMode, setVerificationMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [togglingMode, setTogglingMode] = useState(false);

  // Fetch Settings
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.setting?.verificationMode) {
          setVerificationMode(data.setting.verificationMode);
        }
      })
      .catch(() => {});
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const url =
        filter === "ALL"
          ? "/api/submissions"
          : `/api/submissions?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Failed to load submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  const handleToggleMode = async () => {
    const nextMode = verificationMode === "AUTO" ? "MANUAL" : "AUTO";
    try {
      setTogglingMode(true);
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationMode: nextMode }),
      });
      if (res.ok) {
        setVerificationMode(nextMode);
      }
    } catch (err) {
      console.error("Failed to update verification mode:", err);
    } finally {
      setTogglingMode(false);
    }
  };

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === id ? { ...sub, status: action === "APPROVE" ? "APPROVED" : "REJECTED" } : sub
          )
        );
      }
    } catch (err) {
      console.error("Failed to update submission:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Verification Mode Toggle Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CheckSquare className="h-6 w-6 text-emerald-400" />
            <span>Verification Queue & Submissions</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review proof URLs submitted by users and manage approval workflows.
          </p>
        </div>

        {/* Verification Mode Toggle Switch Card */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5">
          <div className="text-right">
            <span className="text-xs font-semibold text-white block">
              Mode: {verificationMode === "AUTO" ? "Instant Auto-Approval" : "Manual Approval"}
            </span>
            <span className="text-[10px] text-slate-400">
              {verificationMode === "AUTO"
                ? "Valid links credit ₹10 instantly"
                : "Admin must click Approve"}
            </span>
          </div>

          <button
            onClick={handleToggleMode}
            disabled={togglingMode}
            className={`p-1 rounded-xl transition-colors ${
              verificationMode === "AUTO" ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {verificationMode === "AUTO" ? (
              <ToggleRight className="h-8 w-8" />
            ) : (
              <ToggleLeft className="h-8 w-8" />
            )}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === tab
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400">
          Showing {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Submissions Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
            Loading submissions...
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No submissions found under this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Shop Task</th>
                  <th className="pb-3 font-semibold">Review Proof URL</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-850/50">
                    {/* User info */}
                    <td className="py-3.5 pr-3 space-y-0.5">
                      <div className="font-semibold text-white">
                        {sub.user?.name || sub.user?.email}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400">
                        {sub.user?.userCode}
                      </div>
                    </td>

                    {/* Task info */}
                    <td className="py-3.5 pr-3 max-w-xs">
                      <div className="font-medium text-slate-200 truncate">
                        {sub.task?.title}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        +₹{sub.rewardCredited} INR
                      </span>
                    </td>

                    {/* Clickable Proof Link */}
                    <td className="py-3.5 pr-3 max-w-sm">
                      <a
                        href={sub.proofLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-cyan-400 hover:underline font-mono text-[11px] truncate max-w-xs"
                      >
                        <span className="truncate">{sub.proofLink}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      <p className="text-[10px] text-slate-500">
                        {new Date(sub.createdAt).toLocaleString()}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          sub.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : sub.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 text-right space-x-2">
                      {sub.status === "PENDING" ? (
                        <>
                          <button
                            onClick={() => handleAction(sub.id, "APPROVE")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-semibold transition-colors"
                          >
                            Approve (+₹10)
                          </button>
                          <button
                            onClick={() => handleAction(sub.id, "REJECT")}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-[11px] font-semibold transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-500 text-[11px] italic">
                          {sub.adminNotes || "Done"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
