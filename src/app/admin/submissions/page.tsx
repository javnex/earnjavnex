"use client";

import { useEffect, useState } from "react";
import {
  CheckSquare,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <CheckSquare className="h-6 w-6 text-blue-600" />
            <span>Verification Queue & Submissions</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Review proof URLs submitted by users and manage approval workflows.
          </p>
        </div>

        {/* Verification Mode Toggle Switch Card */}
        <div className="flex items-center gap-3.5 bg-white border border-slate-200 shadow-sm rounded-2xl px-4 py-2.5">
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-900 block">
              Mode: {verificationMode === "AUTO" ? "Instant Auto-Approval" : "Manual Approval"}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {verificationMode === "AUTO"
                ? "Valid links credit ₹10 instantly"
                : "Admin manual verification required"}
            </span>
          </div>

          <button
            onClick={handleToggleMode}
            disabled={togglingMode}
            className={`p-1 rounded-xl transition-all cursor-pointer ${
              verificationMode === "AUTO" ? "text-emerald-600 hover:scale-105" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {verificationMode === "AUTO" ? (
              <ToggleRight className="h-8 w-8 text-emerald-600" />
            ) : (
              <ToggleLeft className="h-8 w-8 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                filter === tab
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 font-mono animate-pulse">
            Loading submissions...
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 font-mono space-y-2">
            <CheckSquare className="h-8 w-8 text-slate-400 mx-auto" />
            <p>No submissions found under this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono tracking-wider">
                  <th className="pb-3.5 font-semibold">User</th>
                  <th className="pb-3.5 font-semibold">Shop Task</th>
                  <th className="pb-3.5 font-semibold">Review Proof URL</th>
                  <th className="pb-3.5 font-semibold">Status</th>
                  <th className="pb-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* User info */}
                    <td className="py-4 pr-3 space-y-0.5">
                      <div className="font-bold text-slate-900">
                        {sub.user?.name || sub.user?.email}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        ID: <span className="text-blue-600 font-bold">{sub.user?.userCode}</span>
                      </div>
                    </td>

                    {/* Task info */}
                    <td className="py-4 pr-3 max-w-xs">
                      <div className="font-medium text-slate-900 truncate">
                        {sub.task?.title}
                      </div>
                      <span className="text-[10px] font-mono text-emerald-600 font-bold">
                        +₹{sub.rewardCredited} INR
                      </span>
                    </td>

                    {/* Clickable Proof Link */}
                    <td className="py-4 pr-3 max-w-sm">
                      <a
                        href={sub.proofLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-mono text-[11px] truncate max-w-xs font-semibold"
                      >
                        <span className="truncate">{sub.proofLink}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-blue-500" />
                      </a>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {new Date(sub.createdAt).toLocaleString()}
                      </p>

                      {/* Display Expected Reviewer & Assigned AI Review */}
                      {sub.adminNotes && (
                        <div className="mt-2 rounded-xl bg-blue-50/60 border border-blue-200 p-2.5 text-[11px] space-y-1">
                          <span className="font-bold text-blue-800 block text-[10px] font-mono uppercase tracking-wider">
                            Expected Google Review:
                          </span>
                          <p className="text-slate-700 leading-relaxed font-sans">
                            {sub.adminNotes}
                          </p>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold ${
                          sub.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : sub.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                            : "bg-red-50 text-red-600 border border-red-200"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 text-right space-x-2 shrink-0">
                      {sub.status === "PENDING" ? (
                        <>
                          <button
                            onClick={() => handleAction(sub.id, "APPROVE")}
                            className="px-3 py-1.5 rounded-xl btn-futuristic text-[11px] font-mono font-bold transition-all cursor-pointer"
                          >
                            Approve (+₹10)
                          </button>
                          <button
                            onClick={() => handleAction(sub.id, "REJECT")}
                            className="px-3 py-1.5 rounded-xl btn-futuristic-glass text-[11px] font-mono font-bold transition-all cursor-pointer text-red-600 hover:text-red-700 hover:border-red-200"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-mono italic">
                          {sub.adminNotes ? "Reviewed" : "Done"}
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
