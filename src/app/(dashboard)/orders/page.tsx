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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Orders & Reservations</h2>
          <p className="text-sm text-slate-500">
            Order lifecycle management with strict whole-roll conversions and atomic stock reservations
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded hover:bg-amber-400 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Create Customer Order"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>

          {/* Valid Alternatives Display */}
          {alternatives && alternatives.length > 0 && (
            <div className="mt-2 p-3 bg-white border border-red-200 rounded text-xs space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Recommended Valid Whole-Roll Alternatives:
              </span>
              <div className="flex flex-wrap gap-2">
                {alternatives.map((alt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyAlternative(alt)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-amber-100 border border-slate-300 hover:border-amber-400 rounded text-slate-800 font-mono transition-colors text-left"
                  >
                    <span className="font-bold block">{alt.rolls} rolls</span>
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
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded text-sm text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Create Order Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-slate-300 shadow-md p-6 animate-fadeIn space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-amber-500" />
            New Customer Order Form
          </h3>

          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Select Customer
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white"
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
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white"
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
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Order Quantity Unit
                </label>
                <select
                  value={requestedUnit}
                  onChange={(e: any) => setRequestedUnit(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white font-semibold"
                >
                  <option value="ROLLS">Rolls (whole number)</option>
                  <option value="METRES">Metres (exact multiple of roll length)</option>
                  <option value="NET_KG">Net kg (exact multiple of roll weight)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Requested Quantity ({requestedUnit})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={requestedQuantity}
                  onChange={(e) => setRequestedQuantity(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border-2 border-amber-400 bg-amber-50/20 rounded text-sm font-mono font-bold"
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
                Validate & Create Order
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Orders Directory Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-slate-500" />
            Customer Orders Pipeline
          </h3>
          <span className="text-xs text-slate-500">{orders.length} total orders</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
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
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
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
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {o.customer?.name || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {o.specification?.code || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {parseFloat(o.requestedQuantity).toFixed(3)} {o.requestedUnit}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-amber-700">
                        {o.wholeRolls} rolls
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        <div>{parseFloat(o.totalMetres).toFixed(2)} m</div>
                        <div className="text-[11px] text-slate-400">
                          {parseFloat(o.totalNetKg).toFixed(3)} kg
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isPending
                              ? "bg-slate-100 text-slate-800 border border-slate-300"
                              : o.status === "CONFIRMED"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : o.status === "PARTIALLY_DISPATCHED"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : isFulfilled
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-red-100 text-red-800 border border-red-300"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isPending && (
                            <button
                              onClick={() => handleConfirmOrder(o.id)}
                              disabled={actionLoadingId === o.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-sm disabled:opacity-50"
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
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-sm"
                            >
                              <Truck className="w-3 h-3" />
                              Dispatch
                            </Link>
                          )}

                          {!isCancelled && !isFulfilled && (
                            <button
                              onClick={() => handleCancelOrder(o.id)}
                              disabled={actionLoadingId === o.id}
                              className="px-2 py-1 bg-slate-100 hover:bg-red-50 text-red-600 hover:text-red-700 font-semibold rounded text-[11px] border border-slate-300 hover:border-red-300 inline-flex items-center gap-1"
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
