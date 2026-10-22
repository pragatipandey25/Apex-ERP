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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Finished Goods Inventory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Reconciled physical, reserved, and available stock categorized by engineered tape specification
          </p>
        </div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
        >
          Customer Orders <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg text-xs text-red-700 font-medium shadow-xs">
          {error}
        </div>
      )}

      {/* Finished Goods Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Stock Balances by Specification
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Derived strictly from ledger records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50/80 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200/80 text-[11px]">
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
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading finished inventory...
                  </td>
                </tr>
              ) : !data?.summaries || data.summaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-medium">
                    No specifications configured.
                  </td>
                </tr>
              ) : (
                data.summaries.map((s: any) => (
                  <tr key={s.specificationId} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold font-mono text-slate-900 block">{s.specificationCode}</span>
                      <span className="text-slate-500 text-[11px] block">{s.specificationName}</span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums font-semibold text-slate-800">
                      {s.physicalRolls} rolls
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums font-semibold text-amber-700">
                      {s.reservedRolls} rolls
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums font-bold text-emerald-700 text-sm">
                      {s.availableRolls} rolls
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-700">{s.availableMetres} m</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-700">{s.availableNetKg} kg</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-500">{s.dispatchedRolls} rolls</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Finished Goods Movement Ledger */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Finished Goods Ledger Movements
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Immutable transaction history</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50/80 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200/80 text-[11px]">
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
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading movements...
                  </td>
                </tr>
              ) : !data?.movements || data.movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-medium">
                    No finished goods movements recorded yet. Complete a production batch to create stock.
                  </td>
                </tr>
              ) : (
                data.movements.map((m: any) => {
                  const isPositive = m.wholeRolls > 0;
                  return (
                    <tr key={m.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {m.referenceNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {m.specification?.code || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            m.movementType === "PRODUCTION_RECEIPT"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : m.movementType === "ORDER_DISPATCH"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
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
                        {m.wholeRolls} rolls
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-700">
                        {parseFloat(m.netTapeKg).toFixed(3)} kg
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {m.batch?.batchNumber || m.order?.orderNumber || "—"}
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
