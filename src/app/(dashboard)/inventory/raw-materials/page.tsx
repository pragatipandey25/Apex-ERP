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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Raw Materials Inventory</h2>
          <p className="text-sm text-slate-500">
            Real-time material balances, physical receipts, scrap/damage logs, and ledger traceability
          </p>
        </div>
      </div>

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

      {/* Material Stock Balances Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Film */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            BOPP Base Film
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {data?.balances?.filmKg || "0.000"}{" "}
            <span className="text-sm font-normal text-slate-500">kg</span>
          </div>
          <span className="text-xs text-slate-400 block mt-1">Current on-hand physical stock</span>
        </div>

        {/* Liquid Adhesive */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Liquid Adhesive
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {data?.balances?.liquidAdhesiveKg || "0.000"}{" "}
            <span className="text-sm font-normal text-slate-500">kg</span>
          </div>
          <span className="text-xs text-slate-400 block mt-1">Emulsion adhesive in storage</span>
        </div>

        {/* Cores */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Cardboard Cores
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {data?.balances?.corePieces || 0}{" "}
            <span className="text-sm font-normal text-slate-500">pieces</span>
          </div>
          <span className="text-xs text-slate-400 block mt-1">1 core consumed per finished roll</span>
        </div>
      </div>

      {/* Movement Action Card (Receipt or Damage) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-3 mb-4">
          <button
            onClick={() => {
              setActiveTab("receipt");
              setError(null);
            }}
            className={`flex items-center gap-2 pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "receipt"
                ? "border-amber-500 text-slate-900"
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
            className={`flex items-center gap-2 pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "damage"
                ? "border-amber-500 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <AlertOctagon className="w-4 h-4 text-red-600" />
            Report Material Scrap / Damage
          </button>
        </div>

        {activeTab === "receipt" ? (
          <form onSubmit={handleReceipt} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Material Type
              </label>
              <select
                value={materialType}
                onChange={(e: any) => setMaterialType(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white"
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
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono"
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
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded shadow-sm inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Receipt
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleDamage} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Material Type
              </label>
              <select
                value={materialType}
                onChange={(e: any) => setMaterialType(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white"
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
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono"
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
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm rounded shadow-sm inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Deduct Damaged Stock
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Movement Ledger Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Raw Material Movement Ledger
          </h3>
          <span className="text-xs text-slate-500">Immutable chronological records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
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
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading material movements...
                  </td>
                </tr>
              ) : !data?.movements || data.movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No transactions recorded. All raw material inventory is currently at zero.
                  </td>
                </tr>
              ) : (
                data.movements.map((m: any) => {
                  const qty = parseFloat(m.quantity);
                  const isPositive = qty > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {m.referenceNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{m.materialType}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            m.movementType === "RECEIPT"
                              ? "bg-emerald-100 text-emerald-800"
                              : m.movementType === "PRODUCTION_ISSUE"
                              ? "bg-blue-100 text-blue-800"
                              : m.movementType === "DAMAGE"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {m.movementType}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 font-mono font-bold ${
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
                      <td className="px-4 py-3 text-slate-400">
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
