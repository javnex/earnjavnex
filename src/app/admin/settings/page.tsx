"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [verificationMode, setVerificationMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [cashoutBufferPercent, setCashoutBufferPercent] = useState("6.0");
  const [minWithdrawalInr, setMinWithdrawalInr] = useState("100");
  const [usdtInrRate, setUsdtInrRate] = useState("90.5");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.setting) {
          setVerificationMode(data.setting.verificationMode || "AUTO");
          setCashoutBufferPercent(String(data.setting.cashoutBufferPercent || "6.0"));
          setMinWithdrawalInr(String(data.setting.minWithdrawalInr || "100"));
          setUsdtInrRate(String(data.setting.usdtInrRate || "90.5"));
        }
      })
      .catch((err) => console.error("Error loading settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationMode,
          cashoutBufferPercent: parseFloat(cashoutBufferPercent) || 6.0,
          minWithdrawalInr: parseFloat(minWithdrawalInr) || 100,
          usdtInrRate: parseFloat(usdtInrRate) || 90.5,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update settings");
      }

      setMessage({
        type: "success",
        text: "Platform settings updated successfully!",
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Save error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-violet-400" />
          <span>System Settings & Configuration</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure payout buffers, minimum thresholds, and review verification logic.
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

      <div className="max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-6">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
            Loading settings...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {/* Verification Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Review Verification Mode
              </label>
              <select
                value={verificationMode}
                onChange={(e) =>
                  setVerificationMode(e.target.value as "AUTO" | "MANUAL")
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="AUTO">
                  Instant Auto-Approval (Recommended - URL syntax & duplicate check passes → ₹10 credited instantly)
                </option>
                <option value="MANUAL">
                  Manual Admin Approval (Submissions marked Pending until Admin verifies in Queue)
                </option>
              </select>
            </div>

            {/* Cash-out Buffer Percent */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Cash-Out Conversion Buffer (%)
                </label>
                <span className="text-[11px] text-emerald-400 font-mono">
                  Default: 6.0%
                </span>
              </div>
              <input
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={cashoutBufferPercent}
                onChange={(e) => setCashoutBufferPercent(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white font-mono focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <p className="text-[11px] text-slate-400">
                Added automatically onto user withdrawals to cover Indian exchange spreads and 1% TDS when selling USDT for INR.
              </p>
            </div>

            {/* Minimum Withdrawal INR */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Minimum Withdrawal Threshold (₹ INR)
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  Default: ₹100
                </span>
              </div>
              <input
                type="number"
                step="1"
                min="10"
                value={minWithdrawalInr}
                onChange={(e) => setMinWithdrawalInr(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white font-mono focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* USDT / INR Fallback Rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  USDT / INR Exchange Rate Fallback
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  Live CoinGecko with Fallback
                </span>
              </div>
              <input
                type="number"
                step="0.1"
                min="50"
                value={usdtInrRate}
                onChange={(e) => setUsdtInrRate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white font-mono focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <p className="text-[11px] text-slate-400">
                Used if CoinGecko public API is temporarily rate-limited.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
