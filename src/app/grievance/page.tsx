"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  HelpCircle,
} from "lucide-react";

export default function GrievancePortalPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("DATA_CORRECTION");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<{ id: string; timestamp: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !description) {
      setError("Please fill out all required fields.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/privacy/grievance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, description }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit grievance");
      }

      setTicket({
        id: data.ticketId,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white relative">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-blue-100/60 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-mono text-slate-600 hover:text-blue-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Platform</span>
          </Link>
          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            DPDP Section 13 Desk
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10" id="main-content">
        <div className="space-y-3 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-mono font-bold text-blue-700">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span>Grievance Redressal & Data Protection Officer</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Privacy Grievance & Rights Portal
          </h1>
          <p className="text-xs font-mono text-slate-500">
            India DPDP Act, 2023 Statutory Portal for Data Principals
          </p>
        </div>

        {/* Grievance Officer Mandate Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2 uppercase tracking-wider">
            <Mail className="h-4 w-4 text-blue-600" />
            <span>Designated Grievance Officer & Statutory Timelines</span>
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            Under Section 13 of the Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025, any Data Principal may submit a formal inquiry, request for erasure, data correction, or grievance regarding their digital personal data.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-slate-400 block text-[10px]">DESIGNATION</span>
              <span className="font-bold text-slate-900">Grievance & DPO Desk</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-slate-400 block text-[10px]">ACKNOWLEDGMENT</span>
              <span className="font-bold text-emerald-600">Within 48 Hours</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-slate-400 block text-[10px]">CONTACT EMAIL</span>
              <span className="font-bold text-blue-600">grievance@EarnReward.in</span>
            </div>
          </div>
        </div>

        {/* Ticket Success View */}
        {ticket ? (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-md p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_10px_25px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Grievance Ticket Generated</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Your grievance has been formally registered with our Grievance Officer under India DPDP Act, 2023. An acknowledgment has been generated.
            </p>
            <div className="inline-block p-4 rounded-xl bg-blue-50 border border-blue-200 font-mono text-sm font-bold text-blue-800">
              Reference ID: <span className="underline">{ticket.id}</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Timestamp: {new Date(ticket.timestamp).toLocaleString()}
            </p>
            <div className="pt-4">
              <button
                onClick={() => setTicket(null)}
                className="btn-futuristic px-6 py-2.5 rounded-xl text-xs font-mono font-bold"
              >
                Submit Another Request
              </button>
            </div>
          </div>
        ) : (
          /* Submission Form */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
            <h2 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
              Submit Formal Grievance or Rights Request
            </h2>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-mono text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-slate-700">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full rounded-xl futuristic-input px-3.5 py-2.5 text-xs text-slate-900 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-slate-700">
                    Email Address (Registered or Contact) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your-email@gmail.com"
                    className="w-full rounded-xl futuristic-input px-3.5 py-2.5 text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-700">
                  Request / Grievance Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl futuristic-input px-3.5 py-2.5 text-xs text-slate-900 font-mono bg-white"
                >
                  <option value="DATA_CORRECTION">
                    Right to Correction / Updating of Personal Data (Section 12)
                  </option>
                  <option value="DATA_ERASURE">
                    Right to Erasure / Account Deletion (Section 12)
                  </option>
                  <option value="CONSENT_WITHDRAWAL">
                    Withdrawal of Consent (Section 6)
                  </option>
                  <option value="ACCESS_INFO">
                    Right to Information About Processing (Section 11)
                  </option>
                  <option value="NOMINATION">
                    Right to Nominate (Section 14)
                  </option>
                  <option value="GENERAL_GRIEVANCE">
                    General Privacy / Security Complaint
                  </option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-700">
                  Detailed Description of Request / Grievance *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide complete details including your User ID (e.g. USR-XXXXX) if registered..."
                  className="w-full rounded-xl futuristic-input px-3.5 py-2.5 text-xs text-slate-900 font-mono leading-relaxed"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-futuristic w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-xs font-mono font-bold cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{loading ? "Submitting Request..." : "File Statutory Grievance"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 font-mono mt-16">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p>© 2026 EarnReward. All rights reserved. India DPDP Act 2023 Compliant.</p>
          <div className="flex justify-center gap-4 text-slate-600">
            <Link href="/privacy" className="hover:text-blue-600 hover:underline">Privacy Notice</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-blue-600 hover:underline">Terms of Service</Link>
            <span>•</span>
            <Link href="/refund" className="hover:text-blue-600 hover:underline">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
