"use client";

import { useEffect, useState } from "react";
import { Users, Plus, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
  });

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load customers");
      setCustomers(data.customers);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");

      setSuccess(`Customer '${data.customer.name}' registered successfully.`);
      setShowForm(false);
      setForm({
        code: "",
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
      });
      loadCustomers();
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Accounts</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered commercial client accounts and order distribution channels
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Add Customer"}
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

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-card animate-fadeIn space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              Register New Customer Account
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Customer Code
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CUST-GLOBAL-004"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs uppercase font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Company Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Global Freight & Cargo Ltd"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Michael Ross"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Email
              </label>
              <input
                type="email"
                placeholder="orders@globalfreight.example"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Phone
              </label>
              <input
                type="text"
                placeholder="+1-555-0199"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Address
              </label>
              <input
                type="text"
                placeholder="Industrial Zone 3, Warehouse 12"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-3 border-t border-slate-100">
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
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Customer Directory
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {customers.length} accounts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50/80 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200/80 text-[11px]">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Company Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email & Phone</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Total Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">
                    No customers found. Run seed script or add one above.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{c.code}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.contactPerson || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{c.email || "—"}</div>
                      <div className="text-[11px] text-slate-400">{c.phone || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{c.address || "—"}</td>
                    <td className="px-4 py-3 font-mono tabular-nums font-semibold text-slate-800">
                      {c._count?.orders || 0} orders
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
