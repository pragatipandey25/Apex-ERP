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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Traceable Transaction History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable system-wide ledger and audit log of all raw material movements, batches, orders, and dispatches
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg text-xs text-red-700 font-medium shadow-xs">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Category:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* History Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Audit Trail Ledger
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {history.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-slate-50/80 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200/80 text-[11px]">
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
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading transaction history...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">
                    No matching history events found.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
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
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
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
