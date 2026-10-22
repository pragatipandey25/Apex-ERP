"use client";

import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  XCircle,
  Truck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [specs, setSpecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<any[] | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [specificationId, setSpecificationId] = useState("");
  const [requestedQuantity, setRequestedQuantity] = useState("5");
  const [requestedUnit, setRequestedUnit] = useState<"ROLLS" | "METRES" | "NET_KG">("ROLLS");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [ordersRes, custRes, specsRes] = await Promise.all([
        fetch("/api/orders"),
        fetch("/api/customers"),
        fetch("/api/specifications"),
      ]);

      const [ordersData, custData, specsData] = await Promise.all([
        ordersRes.json(),
        custRes.json(),
        specsRes.json(),
      ]);

      if (ordersData.orders) setOrders(ordersData.orders);
      if (custData.customers) {
        setCustomers(custData.customers);
        if (custData.customers.length > 0 && !customerId) {
          setCustomerId(custData.customers[0].id);
        }
      }
      if (specsData.specifications) {
        setSpecs(specsData.specifications);
        if (specsData.specifications.length > 0 && !specificationId) {
          setSpecificationId(specsData.specifications[0].id);
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

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setAlternatives(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          specificationId,
          requestedQuantity: parseFloat(requestedQuantity),
          requestedUnit,
          orderDate,
          notes,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        if (resJson.alternatives) {
          setAlternatives(resJson.alternatives);
        }
        throw new Error(resJson.error || "Failed to create customer order.");
      }

      setSuccess(`Order '${resJson.order.orderNumber}' created successfully (Whole Rolls: ${resJson.order.wholeRolls}).`);
      setShowForm(false);
      setRequestedQuantity("5");
      setNotes("");
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmOrder(orderId: string) {
    if (!confirm("Confirm order and atomically reserve finished goods inventory?")) return;
    setActionLoadingId(orderId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: "POST",
      });

      const resJson = await res.json();
      if (!res.ok) {
        if (resJson.shortageDetails) {
          throw new Error(
            `${resJson.error} (Available: ${resJson.shortageDetails.availableRolls} rolls, Shortage: ${resJson.shortageDetails.shortageRolls} rolls)`
          );
        }
        throw new Error(resJson.error || "Order confirmation failed.");
      }

      setSuccess(`Order confirmed! Finished rolls reserved atomically.`);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancelOrder(orderId: string) {
    const reason = prompt("Enter cancellation reason:");
    if (reason === null) return;

    setActionLoadingId(orderId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "User requested cancellation" }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Order cancellation failed.");

      setSuccess(resJson.message);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  function applyAlternative(alt: any) {
    if (requestedUnit === "ROLLS") {
      setRequestedQuantity(alt.rolls.toString());
    } else if (requestedUnit === "METRES") {
      setRequestedQuantity(alt.metres.toString());
    } else {
      setRequestedQuantity(alt.netKg.toString());
    }
    setAlternatives(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Orders & Reservations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Order lifecycle management with strict whole-roll conversions and atomic stock reservations
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Create Customer Order"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg text-xs text-red-700 font-medium shadow-xs flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>

          {/* Valid Alternatives Display */}
          {alternatives && alternatives.length > 0 && (
            <div className="mt-2 p-3 bg-white border border-red-200 rounded-lg text-xs space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Recommended Valid Whole-Roll Alternatives:
              </span>
              <div className="flex flex-wrap gap-2">
                {alternatives.map((alt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyAlternative(alt)}
                    className="px-2.5 py-1.5 bg-blue-50/60 hover:bg-blue-100 border border-blue-200 rounded-lg text-slate-800 font-mono transition-colors text-left"
                  >
                    <span className="font-bold block text-blue-900">{alt.rolls} rolls</span>
                    <span className="text-[10px] text-slate-500 block">
                      {alt.metres} m ({alt.netKg} kg)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-lg text-xs text-emerald-800 font-medium shadow-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Create Order Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-6 animate-fadeIn space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              New Customer Order Form
            </h3>
          </div>

          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Select Customer
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Tape Specification
                </label>
                <select
                  value={specificationId}
                  onChange={(e) => setSpecificationId(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                >
                  {specs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Order Date
                </label>
                <input
                  type="date"
                  required
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Order Quantity Unit
                </label>
                <select
                  value={requestedUnit}
                  onChange={(e: any) => setRequestedUnit(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                >
                  <option value="ROLLS">Rolls (whole number)</option>
                  <option value="METRES">Metres (exact multiple of roll length)</option>
                  <option value="NET_KG">Net kg (exact multiple of roll weight)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900">
                  Requested Quantity ({requestedUnit})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={requestedQuantity}
                  onChange={(e) => setRequestedQuantity(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 border-2 border-blue-500 bg-blue-50/20 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Order Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rush delivery requested"
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
                Validate & Create Order
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Orders Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Customer Orders Pipeline
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {orders.length} orders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-slate-50/80 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200/80 text-[11px]">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Specification</th>
                <th className="px-4 py-3">Requested Qty</th>
                <th className="px-4 py-3">Whole Rolls</th>
                <th className="px-4 py-3">Total Metres & Kg</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-medium">
                    No customer orders created yet.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isPending = o.status === "PENDING";
                  const isConfirmed = o.status === "CONFIRMED" || o.status === "PARTIALLY_DISPATCHED";
                  const isCancelled = o.status === "CANCELLED";
                  const isFulfilled = o.status === "FULFILLED";

                  return (
                    <tr key={o.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {o.customer?.name || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {o.specification?.code || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-700">
                        {parseFloat(o.requestedQuantity).toFixed(3)} {o.requestedUnit}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums font-bold text-blue-600">
                        {o.wholeRolls} rolls
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-600">
                        <div>{parseFloat(o.totalMetres).toFixed(2)} m</div>
                        <div className="text-[11px] text-slate-400">
                          {parseFloat(o.totalNetKg).toFixed(3)} kg
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isPending
                              ? "bg-slate-100 text-slate-700 border-slate-300"
                              : o.status === "CONFIRMED"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : o.status === "PARTIALLY_DISPATCHED"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : isFulfilled
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {isPending && (
                            <button
                              onClick={() => handleConfirmOrder(o.id)}
                              disabled={actionLoadingId === o.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[11px] inline-flex items-center gap-1 shadow-xs disabled:opacity-50 transition-all active:scale-[0.99]"
                            >
                              {actionLoadingId === o.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Lock className="w-3 h-3" />
                              )}
                              Confirm & Reserve
                            </button>
                          )}

                          {isConfirmed && (
                            <Link
                              href="/dispatches"
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[11px] inline-flex items-center gap-1 shadow-xs transition-all active:scale-[0.99]"
                            >
                              <Truck className="w-3 h-3" />
                              Dispatch
                            </Link>
                          )}

                          {!isCancelled && !isFulfilled && (
                            <button
                              onClick={() => handleCancelOrder(o.id)}
                              disabled={actionLoadingId === o.id}
                              className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-semibold rounded-lg text-[11px] border border-slate-200 hover:border-rose-200 inline-flex items-center gap-1 transition-all"
                              title="Cancel remaining unshipped balance"
                            >
                              <XCircle className="w-3 h-3" />
                              Cancel
                            </button>
                          )}
                        </div>
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
