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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Admin-Only Corrections</h2>
            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">
              Admin Exclusive
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Immutable audited ledger adjustments with server-enforced role authorization (HTTP 403 for Staff)
          </p>
        </div>
      </div>

      {isStaffForbidden ? (
        <div className="bg-red-50 border-2 border-red-500 p-6 rounded-lg text-center space-y-3">
          <Lock className="w-10 h-10 text-red-600 mx-auto" />
          <h3 className="text-base font-bold text-red-900">Access Strictly Forbidden (HTTP 403)</h3>
          <p className="text-sm text-red-700 max-w-lg mx-auto">
            You are logged in as a <strong>Staff</strong> user. Staff operators can perform daily production,
            receipts, and dispatches, but only an authenticated <strong>Admin</strong> user can view or execute
            audited corrections.
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded text-sm text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Correction Form */}
          <div className="bg-white rounded-lg border border-slate-300 shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                Post Audited Compensating Adjustment
              </h3>
              <span className="text-xs text-slate-500">
                Original posted rows are never deleted; a compensating delta is recorded.
              </span>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Transaction Type
                  </label>
                  <select
                    value={txType}
                    onChange={(e: any) => setTxType(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white"
                  >
                    <option value="MATERIAL_MOVEMENT">Raw Material Movement</option>
                    <option value="FINISHED_MOVEMENT">Finished Goods Movement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-800">
                    Corrected Target Quantity {txType === "FINISHED_MOVEMENT" ? "(Rolls)" : "(kg/pcs)"}
                  </label>
                  <input
                    type="number"
                    step={txType === "FINISHED_MOVEMENT" ? "1" : "any"}
                    required
                    placeholder="e.g. 450.000"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border-2 border-amber-400 bg-amber-50/20 rounded text-sm font-mono font-bold"
                  />
                </div>

                <div className="md:col-span-3">
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
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs inline-flex items-center gap-2 shadow-sm"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Execute Audited Correction
                </button>
              </div>
            </form>
          </div>

          {/* Corrections History Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Audited Corrections Log
              </h3>
              <span className="text-xs text-slate-500">{corrections.length} recorded corrections</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
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
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading corrections...
                      </td>
                    </tr>
                  ) : corrections.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No corrections have been executed.
                      </td>
                    </tr>
                  ) : (
                    corrections.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-bold text-red-700">
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
                        <td className="px-4 py-3 text-slate-400">
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
