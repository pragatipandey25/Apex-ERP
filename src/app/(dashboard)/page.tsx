"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  PackageCheck,
  AlertTriangle,
  Factory,
  ShoppingCart,
  ArrowUpRight,
  RefreshCw,
  Layers,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load dashboard data");
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Factory Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time tape production, raw materials, and finished goods inventory
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300/80 rounded-lg shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/production"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            <Factory className="w-3.5 h-3.5" />
            New Batch
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg text-xs text-red-700 font-medium shadow-xs">
          {error}
        </div>
      )}

      {/* Alerts Banner */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert: any, idx: number) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs shadow-xs ${
                alert.level === "danger"
                  ? "bg-red-50/80 border-red-200 text-red-900"
                  : "bg-amber-50/80 border-amber-200 text-amber-900"
              }`}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Raw Film */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-150">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Raw Film (kg)
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
            {data?.rawMaterials?.filmKg || "0.000"}{" "}
            <span className="text-xs font-medium text-slate-500 font-sans">kg</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>On-hand stock</span>
            <Link
              href="/inventory/raw-materials"
              className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-0.5 text-xs group"
            >
              Receive <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Liquid Adhesive */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-150">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Liquid Adhesive
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
            {data?.rawMaterials?.liquidAdhesiveKg || "0.000"}{" "}
            <span className="text-xs font-medium text-slate-500 font-sans">kg</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>Core stock: <strong className="text-slate-700 font-mono font-semibold">{data?.rawMaterials?.corePieces || 0}</strong> pcs</span>
            <Link
              href="/inventory/raw-materials"
              className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-0.5 text-xs group"
            >
              Manage <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Finished Goods: Available Rolls */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-150">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Available Rolls
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums tracking-tight">
            {data?.finishedGoods?.totalAvailableRolls || 0}{" "}
            <span className="text-xs font-medium text-slate-500 font-sans">rolls</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>Reserved: <strong className="text-slate-700 font-mono font-semibold">{data?.finishedGoods?.totalReservedRolls || 0}</strong> rolls</span>
            <Link
              href="/inventory/finished-goods"
              className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-0.5 text-xs group"
            >
              View FG <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Orders Pipeline */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-150">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Orders Pipeline
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
            {data?.orders?.confirmedOrdersCount || 0}{" "}
            <span className="text-xs font-medium text-slate-500 font-sans">awaiting dispatch</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>Pending: <strong className="text-slate-700 font-mono font-semibold">{data?.orders?.pendingOrdersCount || 0}</strong></span>
            <Link
              href="/orders"
              className="text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-0.5 text-xs group"
            >
              Orders <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Batches & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Production Batches */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Factory className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Recent Production Batches
              </h3>
            </div>
            <Link
              href="/production"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              View All
            </Link>
          </div>

          <div className="mt-3 divide-y divide-slate-100 flex-1">
            {(!data?.recentBatches || data.recentBatches.length === 0) ? (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                <Factory className="w-8 h-8 text-slate-300 stroke-[1.5] mb-2" />
                <p className="text-xs text-slate-400 font-medium">
                  No production batches recorded yet. Raw inventory starts at zero.
                </p>
              </div>
            ) : (
              data.recentBatches.map((batch: any) => (
                <div
                  key={batch.id}
                  className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/70 px-2 -mx-2 rounded-lg transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-900 font-mono">{batch.batchNumber}</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {batch.specification?.code} • {batch.wholeRolls} rolls
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono tabular-nums font-semibold text-slate-800 block">
                      Net: {parseFloat(batch.theoreticalNetTapeKg).toFixed(3)} kg
                    </span>
                    <span className="text-[10px] text-slate-400 inline-flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Material Movements */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Recent Material Movements
              </h3>
            </div>
            <Link
              href="/inventory/raw-materials"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              View Ledger
            </Link>
          </div>

          <div className="mt-3 divide-y divide-slate-100 flex-1">
            {(!data?.recentMovements || data.recentMovements.length === 0) ? (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                <Layers className="w-8 h-8 text-slate-300 stroke-[1.5] mb-2" />
                <p className="text-xs text-slate-400 font-medium">
                  No inventory transactions recorded yet.
                </p>
              </div>
            ) : (
              data.recentMovements.map((m: any) => {
                const qty = parseFloat(m.quantity);
                const isPositive = qty > 0;
                return (
                  <div
                    key={m.id}
                    className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/70 px-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-900 font-mono text-xs">{m.referenceNumber}</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {m.materialType} • {m.movementType}
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-mono tabular-nums font-bold px-2 py-0.5 rounded border inline-block ${
                          isPositive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                            : "bg-slate-50 text-slate-800 border-slate-200/80"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {qty.toFixed(3)} {m.unit}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {m.user?.name || "System"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
