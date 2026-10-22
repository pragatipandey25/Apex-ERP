"use client";

import { useEffect, useState } from "react";
import { Boxes, PlusCircle, AlertOctagon, History, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RawMaterialsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Forms
  const [activeTab, setActiveTab] = useState<"receipt" | "damage">("receipt");
  const [materialType, setMaterialType] = useState<"FILM" | "LIQUID_ADHESIVE" | "CORE">("FILM");
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/materials");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load material balances");
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleReceipt(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const unit = materialType === "CORE" ? "pieces" : "kg";
      const res = await fetch("/api/inventory/materials/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialType,
          quantity: parseFloat(quantity),
          unit,
          notes,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Receipt submission failed");

      setSuccess(`Successfully received ${quantity} ${unit} of ${materialType}.`);
      setQuantity("");
      setNotes("");
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDamage(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/inventory/materials/damage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialType,
          quantity: parseFloat(quantity),
          reason,
          notes,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        if (resJson.shortageDetails) {
          throw new Error(
            `${resJson.error} (Available: ${resJson.shortageDetails.availableQuantity}, Shortage: ${resJson.shortageDetails.shortageQuantity})`
          );
        }
        throw new Error(resJson.error || "Damage submission failed");
      }

      setSuccess(`Recorded damage for ${quantity} of ${materialType}.`);
      setQuantity("");
      setReason("");
      setNotes("");
      loadData();
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Raw Materials Inventory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time material balances, physical receipts, scrap/damage logs, and ledger traceability
          </p>
        </div>
      </div>

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

      {/* Material Stock Balances Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Film */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-card hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              BOPP Base Film
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
            {data?.balances?.filmKg || "0.000"}{" "}
            <span className="text-xs font-normal text-slate-500 font-sans">kg</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Current on-hand physical stock</span>
        </div>

        {/* Liquid Adhesive */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-card hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Liquid Adhesive
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
            {data?.balances?.liquidAdhesiveKg || "0.000"}{" "}
            <span className="text-xs font-normal text-slate-500 font-sans">kg</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Emulsion adhesive in storage</span>
        </div>

        {/* Cores */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-card hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Cardboard Cores
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
            {data?.balances?.corePieces || 0}{" "}
            <span className="text-xs font-normal text-slate-500 font-sans">pieces</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">1 core consumed per finished roll</span>
        </div>
      </div>

      {/* Movement Action Card (Receipt or Damage) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-3 mb-5">
          <button
            onClick={() => {
              setActiveTab("receipt");
              setError(null);
            }}
            className={`flex items-center gap-2 pb-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === "receipt"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            Post Material Receipt
          </button>
          <button
            onClick={() => {
              setActiveTab("damage");
              setError(null);
            }}
            className={`flex items-center gap-2 pb-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === "damage"
                ? "border-rose-600 text-rose-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            Report Material Scrap / Damage
          </button>
        </div>

        {activeTab === "receipt" ? (
          <form onSubmit={handleReceipt} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Material Type
              </label>
              <select
                value={materialType}
                onChange={(e: any) => setMaterialType(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              >
                <option value="FILM">BOPP Film (kg)</option>
                <option value="LIQUID_ADHESIVE">Liquid Adhesive (kg)</option>
                <option value="CORE">Cores (pieces)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Quantity {materialType === "CORE" ? "(pieces)" : "(kg)"}
              </label>
              <input
                type="number"
                step={materialType === "CORE" ? "1" : "any"}
                min="0.001"
                required
                placeholder={materialType === "CORE" ? "100" : "500.000"}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Notes / Supplier Ref
              </label>
              <input
                type="text"
                placeholder="e.g. PO-98124 Supplier Batch A"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs hover:shadow-sm inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Receipt
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleDamage} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Material Type
              </label>
              <select
                value={materialType}
                onChange={(e: any) => setMaterialType(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
              >
                <option value="FILM">BOPP Film (kg)</option>
                <option value="LIQUID_ADHESIVE">Liquid Adhesive (kg)</option>
                <option value="CORE">Cores (pieces)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Damage Quantity {materialType === "CORE" ? "(pieces)" : "(kg)"}
              </label>
              <input
                type="number"
                step={materialType === "CORE" ? "1" : "any"}
                min="0.001"
                required
                placeholder="10.000"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Mandatory Reason
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Drum puncture / handling tear"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-xs hover:shadow-sm inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Deduct Damaged Stock
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Movement Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Raw Material Movement Ledger
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Immutable chronological records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50/80 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200/80 text-[11px]">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Movement Type</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Reason / Notes</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading material movements...
                  </td>
                </tr>
              ) : !data?.movements || data.movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-medium">
                    No transactions recorded. All raw material inventory is currently at zero.
                  </td>
                </tr>
              ) : (
                data.movements.map((m: any) => {
                  const qty = parseFloat(m.quantity);
                  const isPositive = qty > 0;
                  return (
                    <tr key={m.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {m.referenceNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{m.materialType}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            m.movementType === "RECEIPT"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : m.movementType === "PRODUCTION_ISSUE"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : m.movementType === "DAMAGE"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {m.movementType}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 font-mono font-bold tabular-nums ${
                          isPositive ? "text-emerald-600" : "text-slate-800"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {qty.toFixed(3)} {m.unit}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                        {m.reason || m.notes || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{m.user?.name || "System"}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
