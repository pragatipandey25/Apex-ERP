"use client";

import { useEffect, useState } from "react";
import { Truck, Plus, AlertCircle, CheckCircle2, Loader2, History, Package } from "lucide-react";

export default function DispatchesPage() {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [wholeRollsDispatched, setWholeRollsDispatched] = useState("1");
  const [notes, setNotes] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [dispRes, ordRes] = await Promise.all([
        fetch("/api/dispatches"),
        fetch("/api/orders"),
      ]);

      const [dispData, ordData] = await Promise.all([
        dispRes.json(),
        ordRes.json(),
      ]);

      if (dispData.dispatches) setDispatches(dispData.dispatches);
      if (ordData.orders) {
        // Filter orders that can be dispatched: CONFIRMED or PARTIALLY_DISPATCHED
        const dispatchableOrders = ordData.orders.filter(
          (o: any) => o.status === "CONFIRMED" || o.status === "PARTIALLY_DISPATCHED"
        );
        setOrders(dispatchableOrders);
        if (dispatchableOrders.length > 0 && !selectedOrderId) {
          setSelectedOrderId(dispatchableOrders[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const remainingUnshipped = selectedOrder
    ? selectedOrder.wholeRolls -
      (selectedOrder.dispatches?.reduce((sum: number, d: any) => sum + d.wholeRollsDispatched, 0) || 0)
    : 0;

  async function handleDispatch(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/dispatches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId,
          wholeRollsDispatched: parseInt(wholeRollsDispatched),
          notes,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to execute dispatch.");

      setSuccess(
        `Dispatch '${resJson.dispatch.dispatchNumber}' completed successfully. ${
          resJson.isFullyFulfilled ? "Order is now fully fulfilled." : `Remaining: ${resJson.remainingUnshippedRolls} rolls.`
        }`
      );
      setShowForm(false);
      setNotes("");
      setWholeRollsDispatched("1");
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dispatch Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Fulfill confirmed orders via partial or full stock dispatches with ledger deduction
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={orders.length === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Create Dispatch"}
        </button>
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

      {/* Dispatch Creation Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-6 animate-fadeIn space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              Execute Order Dispatch
            </h3>
          </div>

          <form onSubmit={handleDispatch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Select Confirmed Order
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} - {o.customer.name} ({o.wholeRolls} total rolls, status: {o.status})
                    </option>
                  ))}
                </select>
                {selectedOrder && (
                  <span className="text-xs text-blue-700 font-semibold block mt-1">
                    Remaining unshipped reserved balance: {remainingUnshipped} rolls
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900">
                  Rolls to Dispatch
                </label>
                <input
                  type="number"
                  min="1"
                  max={remainingUnshipped || 1}
                  step="1"
                  required
                  value={wholeRollsDispatched}
                  onChange={(e) => setWholeRollsDispatched(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 border-2 border-blue-500 bg-blue-50/20 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Dispatch Notes / Waybill Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Carrier DHL Freight, Tracking #98234-A"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs inline-flex items-center gap-2 shadow-xs transition-all active:scale-[0.99]"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Dispatch & Release Stock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dispatches History Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Dispatch Log
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {dispatches.length} shipments
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-slate-50/80 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200/80 text-[11px]">
              <tr>
                <th className="px-4 py-3">Dispatch #</th>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Specification</th>
                <th className="px-4 py-3">Dispatched Rolls</th>
                <th className="px-4 py-3">Metres</th>
                <th className="px-4 py-3">Net Weight (kg)</th>
                <th className="px-4 py-3">Dispatched By</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading dispatches...
                  </td>
                </tr>
              ) : dispatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-medium">
                    No dispatches executed yet. Confirm an order to enable dispatching.
                  </td>
                </tr>
              ) : (
                dispatches.map((d) => (
                  <tr key={d.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{d.dispatchNumber}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                      {d.order?.orderNumber || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {d.order?.customer?.name || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {d.specification?.code || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums font-bold text-emerald-700">
                      {d.wholeRollsDispatched} rolls
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-700">
                      {parseFloat(d.dispatchedMetres).toFixed(2)} m
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums font-bold text-slate-800">
                      {parseFloat(d.dispatchedNetKg).toFixed(3)} kg
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.user?.name || "System"}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(d.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
