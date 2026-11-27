"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Coins,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ArrowDownToLine,
  Mail,
  Send,
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

  // NOWPayments Connection Test State
  const [testingNp, setTestingNp] = useState(false);
  const [npResult, setNpResult] = useState<{
    connected?: boolean;
    mode?: string;
    message?: string;
    checks?: any;
    configStatus?: any;
  } | null>(null);

  const handleTestNowpayments = async () => {
    try {
      setTestingNp(true);
      const res = await fetch("/api/admin/nowpayments/test", { method: "POST" });
      const data = await res.json();
      setNpResult(data);
    } catch (err: any) {
      setNpResult({
        connected: false,
        message: err.message || "Failed to reach test endpoint",
      });
    } finally {
      setTestingNp(false);
    }
  };

  // Email Delivery Test State
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailSender, setTestEmailSender] = useState<"task" | "payments">("task");
  const [emailTestResult, setEmailTestResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
    provider?: string;
  } | null>(null);

  const handleTestEmail = async () => {
    try {
      setTestingEmail(true);
      setEmailTestResult(null);
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmailTo.trim() || undefined,
          senderType: testEmailSender,
        }),
      });
      const data = await res.json();
      setEmailTestResult(data);
    } catch (err: any) {
      setEmailTestResult({
        success: false,
        error: err.message || "Failed to reach email test endpoint",
      });
    } finally {
      setTestingEmail(false);
    }
  };

  // Top-Up Custody State
  const [topupAmount, setTopupAmount] = useState("10");
  const [generatingDeposit, setGeneratingDeposit] = useState(false);
  const [depositData, setDepositData] = useState<{
    depositAddress?: string;
    amountToPay?: number;
    currency?: string;
    network?: string;
    instructions?: string;
  } | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);

  const handleGenerateDeposit = async () => {
    try {
      setGeneratingDeposit(true);
      const res = await fetch("/api/admin/nowpayments/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: parseFloat(topupAmount) || 10 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDepositData(data);
      } else {
        alert(data.error || "Failed to generate deposit address");
      }
    } catch (e: any) {
      alert(e.message || "Error generating deposit address");
    } finally {
      setGeneratingDeposit(false);
    }
  };

  const copyDepositAddress = () => {
    if (!depositData?.depositAddress) return;
    navigator.clipboard.writeText(depositData.depositAddress);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

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
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-blue-600" />
          <span>System Settings & Configuration</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-mono">
          Configure payout buffers, minimum thresholds, and review verification logic.
        </p>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 text-xs font-mono font-medium border ${
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
            className="text-xs hover:underline text-slate-500 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono animate-pulse">
            Loading platform settings...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {/* Verification Mode */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider block">
                Review Verification Mode
              </label>
              <select
                value={verificationMode}
                onChange={(e) =>
                  setVerificationMode(e.target.value as "AUTO" | "MANUAL")
                }
                className="w-full rounded-xl futuristic-input px-3.5 py-2.5 text-xs text-slate-900 font-mono bg-white"
              >
                <option value="AUTO">
                  Instant Auto-Approval (URL syntax & duplicate check passes → ₹10 credited instantly)
                </option>
                <option value="MANUAL">
                  Manual Admin Approval (Submissions marked Pending until Admin verifies in Queue)
                </option>
              </select>
            </div>

            {/* Cash-out Buffer Percent */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider">
                  Cash-Out Conversion Buffer (%)
                </label>
                <span className="text-[11px] text-blue-600 font-mono font-bold">
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
                className="w-full rounded-xl futuristic-input px-3.5 py-2.5 text-xs text-slate-900 font-mono"
              />
              <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
                Added automatically onto user withdrawals to cover Indian exchange spreads and 1% TDS when selling USDT for INR.
              </p>
            </div>

            {/* Minimum Withdrawal INR */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider">
                  Minimum Withdrawal Threshold (₹ INR)
                </label>
                <span className="text-[11px] text-blue-600 font-mono font-bold">
                  Default: ₹100
                </span>
              </div>
              <input
                type="number"
                step="1"
                min="10"
                value={minWithdrawalInr}
                onChange={(e) => setMinWithdrawalInr(e.target.value)}
                className="w-full rounded-xl futuristic-input px-3.5 py-2.5 text-xs text-slate-900 font-mono"
              />
            </div>

            {/* USDT / INR Fallback Rate */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider">
                  USDT / INR Exchange Rate Fallback
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  Live CoinGecko with Fallback
                </span>
              </div>
              <input
                type="number"
                step="0.1"
                min="50"
                value={usdtInrRate}
                onChange={(e) => setUsdtInrRate(e.target.value)}
                className="w-full rounded-xl futuristic-input px-3.5 py-2.5 text-xs text-slate-900 font-mono"
              />
              <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
                Used if CoinGecko public API is temporarily rate-limited.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-xl btn-futuristic px-6 py-2.5 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
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
            </div>
          </form>
        )}
      </div>

      {/* NOWPayments Gateway Diagnostics & Live Status Card */}
      <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
                NOWPayments Automated Custody Gateway
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Real-time connection test for automatic USDT disbursements
              </p>
            </div>
          </div>

          <button
            onClick={handleTestNowpayments}
            disabled={testingNp}
            className="btn-futuristic flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${testingNp ? "animate-spin" : ""}`} />
            <span>{testingNp ? "Testing API..." : "Test Connection"}</span>
          </button>
        </div>

        {npResult ? (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border text-xs font-mono flex items-start gap-3 ${
                npResult.connected
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : npResult.mode === "SIMULATION"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {npResult.connected ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold uppercase tracking-wider text-[11px]">
                  Status: {npResult.mode || "DISCONNECTED"}
                </div>
                <p className="leading-relaxed">{npResult.message}</p>
              </div>
            </div>

            {/* Credential Status Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-semibold">API Key</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    npResult.configStatus?.hasApiKey
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {npResult.configStatus?.hasApiKey ? "CONFIGURED" : "MISSING"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Account Login (JWT)</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    npResult.checks?.auth
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {npResult.checks?.auth ? "VERIFIED" : "NOT LOGGED IN"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Automated 2FA TOTP</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    npResult.checks?.twoFa
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {npResult.checks?.twoFa ? "ENABLED" : "NOT SET"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Webhook IPN Secret</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    npResult.configStatus?.hasIpnSecret
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {npResult.configStatus?.hasIpnSecret ? "CONFIGURED" : "OPTIONAL"}
                </span>
              </div>
            </div>

            {/* Custody Balances */}
            {npResult.checks?.balances && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs font-mono space-y-2">
                <div className="font-bold text-blue-900 flex items-center justify-between">
                  <span>NOWPayments Custody Balance:</span>
                  <span className="text-sm text-emerald-700">
                    {npResult.checks.balances.usdtmatic?.amount ?? 0} USDT (Polygon)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  This balance is automatically deducted when users withdraw.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono flex items-center justify-between">
            <span>Click &quot;Test Connection&quot; to check your NOWPayments custody integration.</span>
          </div>
        )}
      </div>

      {/* Direct Custody Top-Up Tool */}
      <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
            <ArrowDownToLine className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
              Top Up Custody Reserve
            </h2>
            <p className="text-[11px] text-slate-500 font-mono">
              Deposit USDT (Polygon network) to fund automatic user withdrawals
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1.5 flex-1 w-full">
              <label className="text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider">
                Deposit Amount ($ USD)
              </label>
              <input
                type="number"
                min="5"
                step="5"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="e.g. 10 or 50"
                className="w-full rounded-xl futuristic-input px-3.5 py-2.5 text-xs text-slate-900 font-mono"
              />
            </div>

            <button
              onClick={handleGenerateDeposit}
              disabled={generatingDeposit}
              className="btn-futuristic px-5 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 w-full sm:w-auto"
            >
              {generatingDeposit ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4" />
                  <span>Generate Deposit Address</span>
                </>
              )}
            </button>
          </div>

          {depositData && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-900">
                <span>Polygon Deposit Address Generated:</span>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                  {depositData.network}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-emerald-200 font-mono text-xs text-slate-900 flex items-center justify-between gap-2">
                <span className="truncate select-all font-bold text-slate-800">
                  {depositData.depositAddress}
                </span>
                <button
                  onClick={copyDepositAddress}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer transition-colors shrink-0"
                >
                  {copiedAddr ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center text-xs font-mono text-emerald-800">
                <span>Exact Amount to Send:</span>
                <span className="font-black text-sm text-emerald-900">
                  {depositData.amountToPay} USDT
                </span>
              </div>

              <p className="text-[11px] text-slate-600 font-mono leading-relaxed">
                Send exactly {depositData.amountToPay} USDT on the Polygon network from any wallet (MetaMask, TrustWallet, Binance, etc.). Once confirmed on the blockchain, NOWPayments will automatically credit your Custody balance.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Email Delivery Test Card */}
      <div className="glare-card rounded-2xl p-6 space-y-5 border border-slate-200 bg-white">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
              HTTPS Mailer & Domain Delivery Test
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Send a live test email from @javnex.in to verify your Resend / ZeptoMail setup
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider">
                Recipient Email
              </label>
              <input
                type="email"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                placeholder="Leave blank to send to your admin email"
                className="w-full rounded-xl futuristic-input px-3.5 py-2.5 text-xs text-slate-900 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider">
                Sender Profile
              </label>
              <select
                value={testEmailSender}
                onChange={(e) => setTestEmailSender(e.target.value as any)}
                className="w-full rounded-xl futuristic-input px-3.5 py-2.5 text-xs text-slate-900 font-mono bg-white"
              >
                <option value="task">task@javnex.in (Task Alerts)</option>
                <option value="payments">payments@javnex.in (Payout Receipts)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-slate-400 font-mono">
              Requires <code>RESEND_API_KEY</code> in Cloudflare Worker Secrets.
            </p>
            <button
              onClick={handleTestEmail}
              disabled={testingEmail}
              className="btn-futuristic px-5 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {testingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending Test Email...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Test Email</span>
                </>
              )}
            </button>
          </div>

          {emailTestResult && (
            <div
              className={`p-4 rounded-xl border text-xs font-mono space-y-2 animate-in fade-in duration-200 ${
                emailTestResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {emailTestResult.success ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Email Delivered Successfully!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    <span>Delivery Failed</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed">
                {emailTestResult.message || emailTestResult.error}
              </p>
              {emailTestResult.provider && (
                <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/70 border border-current">
                  Provider: {emailTestResult.provider}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
