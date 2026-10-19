"use client";

import { useEffect, useState } from "react";
import { History, Search, Filter, Loader2, ArrowUpDown } from "lucide-react";

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterType !== "ALL") params.set("type", filterType);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/history?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load audit history");
      setHistory(data.history);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [filterType]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadHistory();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Traceable Transaction History</h2>
          <p className="text-sm text-slate-500">
            Immutable system-wide ledger and audit log of all raw material movements, batches, orders, and dispatches
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Category:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs bg-white font-medium text-slate-800"
          >
            <option value="ALL">All Categories</option>
            <option value="MATERIAL">Raw Materials</option>
            <option value="FINISHED">Finished Goods</option>
            <option value="PRODUCTION">Production Batches</option>
            <option value="ORDER">Customer Orders</option>
            <option value="DISPATCH">Dispatches</option>
            <option value="CORRECTION">Admin Corrections</option>
            <option value="AUDIT">System Audit Logs</option>
          </select>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search reference, notes, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
          >
            Filter
          </button>
        </form>
      </div>

      {/* History Ledger Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Category & Type</th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3">Details / Reason</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading transaction history...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No matching history events found.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.reference}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800 block text-[11px]">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{item.summary}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-sm truncate text-[11px]">
                      {item.details || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{item.user}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {new Date(item.timestamp).toLocaleString()}
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
