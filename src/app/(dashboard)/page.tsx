"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  PackageCheck,
  AlertTriangle,
  Factory,
  ShoppingCart,
  Truck,
  ArrowUpRight,
  RefreshCw,
  Layers,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Factory Overview</h2>
          <p className="text-sm text-slate-500">
            Real-time tape production, raw materials, and finished goods inventory
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/production"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 rounded hover:bg-amber-400 transition-colors"
          >
            <Factory className="w-3.5 h-3.5" />
            New Batch
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Alerts Banner */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert: any, idx: number) => (
            <div
              key={idx}
              className={`p-3 rounded-md border flex items-center gap-3 text-sm ${
                alert.level === "danger"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Raw Film */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Raw Film (kg)</span>
            <Boxes className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {data?.rawMaterials?.filmKg || "0.000"}{" "}
            <span className="text-sm font-normal text-slate-500">kg</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>On-hand stock</span>
            <Link
              href="/inventory/raw-materials"
              className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1"
            >
              Receive <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Liquid Adhesive */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Liquid Adhesive</span>
            <Boxes className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {data?.rawMaterials?.liquidAdhesiveKg || "0.000"}{" "}
            <span className="text-sm font-normal text-slate-500">kg</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Core stock: {data?.rawMaterials?.corePieces || 0} pcs</span>
            <Link
              href="/inventory/raw-materials"
              className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1"
            >
              Manage <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Finished Goods: Available Rolls */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Rolls</span>
            <PackageCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {data?.finishedGoods?.totalAvailableRolls || 0}{" "}
            <span className="text-sm font-normal text-slate-500">rolls</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Reserved: {data?.finishedGoods?.totalReservedRolls || 0} rolls</span>
            <Link
              href="/inventory/finished-goods"
              className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1"
            >
              View FG <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Orders Pipeline */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Orders Pipeline</span>
            <ShoppingCart className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {data?.orders?.confirmedOrdersCount || 0}{" "}
            <span className="text-sm font-normal text-slate-500">awaiting dispatch</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Pending: {data?.orders?.pendingOrdersCount || 0}</span>
            <Link
              href="/orders"
              className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1"
            >
              Orders <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Batches & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Production Batches */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Factory className="w-4 h-4 text-amber-500" />
              Recent Production Batches
            </h3>
            <Link href="/production" className="text-xs text-amber-600 hover:text-amber-700 font-medium">
              View All
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {(!data?.recentBatches || data.recentBatches.length === 0) ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No production batches recorded yet. Raw inventory starts at zero.
              </p>
            ) : (
              data.recentBatches.map((batch: any) => (
                <div key={batch.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-slate-900">{batch.batchNumber}</span>
                    <span className="text-xs text-slate-500 block">
                      {batch.specification?.code} • {batch.wholeRolls} rolls
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-medium text-slate-700 block">
                      Net: {parseFloat(batch.theoreticalNetTapeKg).toFixed(3)} kg
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Material Movements */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              Recent Material Movements
            </h3>
            <Link
              href="/inventory/raw-materials"
              className="text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              View Ledger
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {(!data?.recentMovements || data.recentMovements.length === 0) ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No inventory transactions recorded yet.
              </p>
            ) : (
              data.recentMovements.map((m: any) => {
                const qty = parseFloat(m.quantity);
                const isPositive = qty > 0;
                return (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-slate-800 text-xs">{m.referenceNumber}</span>
                      <span className="text-[11px] text-slate-500 block">
                        {m.materialType} • {m.movementType}
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-mono font-bold ${
                          isPositive ? "text-emerald-600" : "text-slate-800"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {qty.toFixed(3)} {m.unit}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
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
