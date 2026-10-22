"use client";

import { useEffect, useState } from "react";
import { PackageCheck, History, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function FinishedGoodsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/finished-goods");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load finished goods inventory");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Finished Goods Inventory</h2>
          <p className="text-sm text-slate-500">
            Reconciled physical, reserved, and available stock categorized by engineered tape specification
          </p>
        </div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded hover:bg-amber-400 transition-colors shadow-sm"
        >
          Customer Orders <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Finished Goods Stock Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            Stock Balances by Specification
          </h3>
          <span className="text-xs text-slate-500">Derived strictly from ledger records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Specification</th>
                <th className="px-4 py-3">Physical Rolls</th>
                <th className="px-4 py-3">Reserved Rolls</th>
                <th className="px-4 py-3">Available Rolls</th>
                <th className="px-4 py-3">Available Metres</th>
                <th className="px-4 py-3">Available Net Kg</th>
                <th className="px-4 py-3">Dispatched Rolls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading finished inventory...
                  </td>
                </tr>
              ) : !data?.summaries || data.summaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No specifications configured.
                  </td>
                </tr>
              ) : (
                data.summaries.map((s: any) => (
                  <tr key={s.specificationId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-bold font-mono text-slate-900 block">{s.specificationCode}</span>
                      <span className="text-slate-500 text-[11px] block">{s.specificationName}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                      {s.physicalRolls} rolls
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-amber-700">
                      {s.reservedRolls} rolls
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700 text-sm">
                      {s.availableRolls} rolls
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{s.availableMetres} m</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{s.availableNetKg} kg</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{s.dispatchedRolls} rolls</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Finished Goods Movement Ledger */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Finished Goods Ledger Movements
          </h3>
          <span className="text-xs text-slate-500">Immutable transaction history</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Specification</th>
                <th className="px-4 py-3">Movement Type</th>
                <th className="px-4 py-3">Whole Rolls</th>
                <th className="px-4 py-3">Net Kg</th>
                <th className="px-4 py-3">Order / Batch Ref</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading movements...
                  </td>
                </tr>
              ) : !data?.movements || data.movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No finished goods movements recorded yet. Complete a production batch to create stock.
                  </td>
                </tr>
              ) : (
                data.movements.map((m: any) => {
                  const isPositive = m.wholeRolls > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {m.referenceNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {m.specification?.code || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            m.movementType === "PRODUCTION_RECEIPT"
                              ? "bg-emerald-100 text-emerald-800"
                              : m.movementType === "ORDER_DISPATCH"
                              ? "bg-blue-100 text-blue-800"
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
                        {m.wholeRolls} rolls
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {parseFloat(m.netTapeKg).toFixed(3)} kg
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {m.batch?.batchNumber || m.order?.orderNumber || "—"}
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
