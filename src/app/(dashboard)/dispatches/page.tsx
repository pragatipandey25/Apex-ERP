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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dispatch Management</h2>
          <p className="text-sm text-slate-500">
            Fulfill confirmed orders via partial or full stock dispatches with ledger deduction
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={orders.length === 0}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded hover:bg-amber-400 transition-colors shadow-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Create Dispatch"}
        </button>
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

      {/* Dispatch Creation Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-slate-300 shadow-md p-6 animate-fadeIn space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-500" />
            Execute Order Dispatch
          </h3>

          <form onSubmit={handleDispatch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Select Confirmed Order
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} - {o.customer.name} ({o.wholeRolls} total rolls, status: {o.status})
                    </option>
                  ))}
                </select>
                {selectedOrder && (
                  <span className="text-xs text-amber-700 font-semibold block mt-1">
                    Remaining unshipped reserved balance: {remainingUnshipped} rolls
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-800">
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
                  className="mt-1 w-full px-3 py-2 border-2 border-amber-400 bg-amber-50/20 rounded text-sm font-mono font-bold"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Dispatch Notes / Waybill Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Carrier DHL Freight, Tracking #98234-A"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded text-xs inline-flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Dispatch & Release Stock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dispatches History Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Dispatch Log
          </h3>
          <span className="text-xs text-slate-500">{dispatches.length} completed shipments</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
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
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading dispatches...
                  </td>
                </tr>
              ) : dispatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No dispatches executed yet. Confirm an order to enable dispatching.
                  </td>
                </tr>
              ) : (
                dispatches.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
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
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                      {d.wholeRollsDispatched} rolls
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {parseFloat(d.dispatchedMetres).toFixed(2)} m
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {parseFloat(d.dispatchedNetKg).toFixed(3)} kg
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.user?.name || "System"}</td>
                    <td className="px-4 py-3 text-slate-400">
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
