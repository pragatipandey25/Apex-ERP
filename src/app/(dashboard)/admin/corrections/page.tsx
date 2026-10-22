"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  History,
  FileSpreadsheet,
} from "lucide-react";

export default function AdminCorrectionsPage() {
  const [corrections, setCorrections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isStaffForbidden, setIsStaffForbidden] = useState(false);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [origRef, setOrigRef] = useState("");
  const [txType, setTxType] = useState<"MATERIAL_MOVEMENT" | "FINISHED_MOVEMENT">("MATERIAL_MOVEMENT");
  const [newQty, setNewQty] = useState("");
  const [reason, setReason] = useState("");

  async function loadCorrections() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/corrections");
      if (res.status === 403) {
        setIsStaffForbidden(true);
        throw new Error("HTTP 403 Forbidden: Staff users are strictly prohibited from performing audited corrections.");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load corrections");
      setCorrections(data.corrections);
      setIsStaffForbidden(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCorrections();
  }, []);

  async function handleCorrectionSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalTransactionReference: origRef.trim(),
          transactionType: txType,
          newQuantity: parseFloat(newQty),
          reason: reason.trim(),
        }),
      });

      const resJson = await res.json();
      if (res.status === 403) {
        throw new Error(
          "HTTP 403 Forbidden: Staff role cannot execute corrections. Authorization rejected by server."
        );
      }
      if (!res.ok) throw new Error(resJson.error || "Failed to execute correction.");

      setSuccess(
        `Correction '${resJson.correction.correctionReference}' successfully committed. Compensating adjustment applied.`
      );
      setOrigRef("");
      setNewQty("");
      setReason("");
      loadCorrections();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Admin-Only Corrections</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable audited ledger adjustments with server-enforced role authorization (HTTP 403 for Staff)
          </p>
        </div>
      </div>

      {isStaffForbidden ? (
        <div className="bg-rose-50/80 border border-rose-200 p-8 rounded-xl text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-rose-950">Access Strictly Forbidden (HTTP 403)</h3>
          <p className="text-xs text-rose-700 max-w-lg mx-auto">
            You are logged in as a <strong>Staff</strong> user. Staff operators can perform daily production,
            receipts, and dispatches, but only an authenticated <strong>Admin</strong> user can view or execute
            audited corrections.
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg text-xs text-red-700 font-medium shadow-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-lg text-xs text-emerald-800 font-medium shadow-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Correction Form */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                Post Audited Compensating Adjustment
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Original posted rows are never deleted; a compensating delta is recorded.
              </span>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Original Transaction Ref
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. REC-FIL-171829302"
                    value={origRef}
                    onChange={(e) => setOrigRef(e.target.value)}
                    className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Transaction Type
                  </label>
                  <select
                    value={txType}
                    onChange={(e: any) => setTxType(e.target.value)}
                    className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
                  >
                    <option value="MATERIAL_MOVEMENT">Raw Material Movement</option>
                    <option value="FINISHED_MOVEMENT">Finished Goods Movement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-rose-900">
                    Corrected Target Quantity {txType === "FINISHED_MOVEMENT" ? "(Rolls)" : "(kg/pcs)"}
                  </label>
                  <input
                    type="number"
                    step={txType === "FINISHED_MOVEMENT" ? "1" : "any"}
                    required
                    placeholder="e.g. 450.000"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    className="mt-1.5 w-full px-3 py-2 border-2 border-rose-500 bg-rose-50/20 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 transition-all"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Mandatory Audit Justification Reason (min 5 chars)
                  </label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    placeholder="e.g. Supplier weight slip re-weighed due to tare scale calibration offset"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs inline-flex items-center gap-2 shadow-xs transition-all active:scale-[0.99]"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Execute Audited Correction
                </button>
              </div>
            </form>
          </div>

          {/* Corrections History Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Audited Corrections Log
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                {corrections.length} corrections
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[800px]">
                <thead className="bg-slate-50/80 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200/80 text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Correction Ref</th>
                    <th className="px-4 py-3">Original Transaction</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Adjustment Delta</th>
                    <th className="px-4 py-3">Justification Reason</th>
                    <th className="px-4 py-3">Admin User</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-600" />
                        Loading corrections...
                      </td>
                    </tr>
                  ) : corrections.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-medium">
                        No corrections have been executed.
                      </td>
                    </tr>
                  ) : (
                    corrections.map((c) => (
                      <tr key={c.id} className="hover:bg-rose-50/10 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-rose-700">
                          {c.correctionReference}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-800">
                          {c.originalTransactionReference}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{c.transactionType}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {c.deltaSummary}
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{c.reason}</td>
                        <td className="px-4 py-3 text-slate-600">{c.adminUser?.name || "Admin"}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                          {new Date(c.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
