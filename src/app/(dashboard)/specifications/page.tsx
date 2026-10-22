"use client";

import { useEffect, useState } from "react";
import { Layers, Plus, Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function SpecificationsPage() {
  const [specs, setSpecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    widthMm: "",
    filmGsm: "",
    dryAdhesiveGsm: "",
    adhesiveSolidsPercent: "",
    rollLengthM: "",
  });

  async function loadSpecs() {
    setLoading(true);
    try {
      const res = await fetch("/api/specifications");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load specifications");
      setSpecs(data.specifications);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSpecs();
  }, []);

  function fillDummySpec() {
    setForm({
      code: `APEX-BOPP-48-${Date.now().toString().slice(-4)}`,
      name: "Assessment Standard 48mm x 1000m",
      widthMm: "48",
      filmGsm: "25",
      dryAdhesiveGsm: "22",
      adhesiveSolidsPercent: "50",
      rollLengthM: "1000",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        code: form.code,
        name: form.name,
        widthMm: parseFloat(form.widthMm),
        filmGsm: parseFloat(form.filmGsm),
        dryAdhesiveGsm: parseFloat(form.dryAdhesiveGsm),
        adhesiveSolidsPercent: parseFloat(form.adhesiveSolidsPercent),
        rollLengthM: parseFloat(form.rollLengthM),
      };

      const res = await fetch("/api/specifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create specification");

      setSuccess(`Specification '${data.specification.code}' created successfully.`);
      setShowForm(false);
      setForm({
        code: "",
        name: "",
        widthMm: "",
        filmGsm: "",
        dryAdhesiveGsm: "",
        adhesiveSolidsPercent: "",
        rollLengthM: "",
      });
      loadSpecs();
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tape Specifications</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Engineered tape product definitions with permanent batch immutability protection
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "New Specification"}
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

      {/* Creation Modal / Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-card animate-fadeIn space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              Define New Tape Specification
            </h3>
            <button
              type="button"
              onClick={fillDummySpec}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-2.5 py-1 rounded-lg bg-blue-50/80 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              Fill Assessment Dummy Spec (48mm / 1000m)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Specification Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. APEX-BOPP-48-1000"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Packaging Tape 48mm x 1000m"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Width (mm)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  placeholder="48"
                  value={form.widthMm}
                  onChange={(e) => setForm({ ...form, widthMm: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Film GSM (g/m²)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  placeholder="25"
                  value={form.filmGsm}
                  onChange={(e) => setForm({ ...form, filmGsm: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Dry Adhesive GSM (g/m²)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  placeholder="22"
                  value={form.dryAdhesiveGsm}
                  onChange={(e) => setForm({ ...form, dryAdhesiveGsm: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Adhesive Solids (%) (0 - 100)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0.1"
                  max="100"
                  placeholder="50"
                  value={form.adhesiveSolidsPercent}
                  onChange={(e) => setForm({ ...form, adhesiveSolidsPercent: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Roll Length (metres)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  placeholder="1000"
                  value={form.rollLengthM}
                  onChange={(e) => setForm({ ...form, rollLengthM: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs inline-flex items-center gap-2 shadow-xs transition-colors"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Specification
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Specifications Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Master Tape Catalogue
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {specs.length} specs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50/80 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200/80 text-[11px]">
              <tr>
                <th className="px-4 py-3">Code & Name</th>
                <th className="px-4 py-3">Width</th>
                <th className="px-4 py-3">Film GSM</th>
                <th className="px-4 py-3">Dry Adhesive</th>
                <th className="px-4 py-3">Solids %</th>
                <th className="px-4 py-3">Length</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading specifications...
                  </td>
                </tr>
              ) : specs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No specifications configured.
                  </td>
                </tr>
              ) : (
                specs.map((s) => (
                  <tr key={s.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 font-mono">{s.code}</div>
                      <div className="text-slate-500 text-[11px]">{s.name}</div>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-800">{s.widthMm} mm</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-800">{s.filmGsm} g/m²</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-800">{s.dryAdhesiveGsm} g/m²</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-800">{s.adhesiveSolidsPercent}%</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-800">{s.rollLengthM} m</td>
                    <td className="px-4 py-3">
                      {s.isUsedInProduction ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300/80">
                          <Lock className="w-3 h-3 text-slate-500" />
                          Locked (Used in Prod)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Editable
                        </span>
                      )}
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
