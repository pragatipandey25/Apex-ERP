"use client";

import { useEffect, useState } from "react";
import { Calculator, Sparkles, Layers, ArrowRight } from "lucide-react";

export default function BOMCalculatorPage() {
  const [specs, setSpecs] = useState<any[]>([]);
  const [selectedSpecId, setSelectedSpecId] = useState<string>("");
  const [rolls, setRolls] = useState<number>(1);

  // Form parameters
  const [widthMm, setWidthMm] = useState<string>("48");
  const [filmGsm, setFilmGsm] = useState<string>("25");
  const [dryAdhesiveGsm, setDryAdhesiveGsm] = useState<string>("22");
  const [solidsPercent, setSolidsPercent] = useState<string>("50");
  const [rollLengthM, setRollLengthM] = useState<string>("1000");

  const [bomResult, setBomResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/specifications")
      .then((res) => res.json())
      .then((data) => {
        if (data.specifications) {
          setSpecs(data.specifications);
          if (data.specifications.length > 0) {
            applySpec(data.specifications[0]);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  function applySpec(spec: any) {
    setSelectedSpecId(spec.id);
    setWidthMm(spec.widthMm.toString());
    setFilmGsm(spec.filmGsm.toString());
    setDryAdhesiveGsm(spec.dryAdhesiveGsm.toString());
    setSolidsPercent(spec.adhesiveSolidsPercent.toString());
    setRollLengthM(spec.rollLengthM.toString());
  }

  function handleSpecChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedSpecId(id);
    const found = specs.find((s) => s.id === id);
    if (found) {
      applySpec(found);
    }
  }

  function setAssessmentDummy() {
    setSelectedSpecId("");
    setWidthMm("48");
    setFilmGsm("25");
    setDryAdhesiveGsm("22");
    setSolidsPercent("50");
    setRollLengthM("1000");
  }

  async function calculateBOM() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bom/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widthMm: parseFloat(widthMm),
          filmGsm: parseFloat(filmGsm),
          dryAdhesiveGsm: parseFloat(dryAdhesiveGsm),
          adhesiveSolidsPercent: parseFloat(solidsPercent),
          rollLengthM: parseFloat(rollLengthM),
          rolls: Number(rolls),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to calculate BOM");
      setBomResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (widthMm && filmGsm && dryAdhesiveGsm && solidsPercent && rollLengthM && rolls > 0) {
      calculateBOM();
    }
  }, [widthMm, filmGsm, dryAdhesiveGsm, solidsPercent, rollLengthM, rolls]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Bill of Materials (BOM) Calculator
          </h2>
          <p className="text-sm text-slate-500">
            Real-time material consumption formulas and theoretical tape weight calculator
          </p>
        </div>
        <button
          onClick={setAssessmentDummy}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Load Assessment Dummy Parameters
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Main Grid: Inputs vs Calculation Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Parameters Panel */}
        <div className="lg:col-span-5 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              Specification Parameters
            </h3>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Select Saved Specification
            </label>
            <select
              value={selectedSpecId}
              onChange={handleSpecChange}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white"
            >
              <option value="">Custom Parameters</option>
              {specs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600">Width (mm)</label>
              <input
                type="number"
                value={widthMm}
                onChange={(e) => {
                  setSelectedSpecId("");
                  setWidthMm(e.target.value);
                }}
                className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Roll Length (m)</label>
              <input
                type="number"
                value={rollLengthM}
                onChange={(e) => {
                  setSelectedSpecId("");
                  setRollLengthM(e.target.value);
                }}
                className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Film GSM (g/m²)</label>
              <input
                type="number"
                value={filmGsm}
                onChange={(e) => {
                  setSelectedSpecId("");
                  setFilmGsm(e.target.value);
                }}
                className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">
                Dry Adhesive GSM (g/m²)
              </label>
              <input
                type="number"
                value={dryAdhesiveGsm}
                onChange={(e) => {
                  setSelectedSpecId("");
                  setDryAdhesiveGsm(e.target.value);
                }}
                className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">
                Adhesive Solids (%)
              </label>
              <input
                type="number"
                value={solidsPercent}
                onChange={(e) => {
                  setSelectedSpecId("");
                  setSolidsPercent(e.target.value);
                }}
                className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-700">
                Requested Rolls
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={rolls}
                onChange={(e) => setRolls(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1 w-full px-3 py-1.5 border-2 border-amber-400 bg-amber-50/30 rounded text-sm font-mono font-bold"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-semibold block text-slate-800">BOM Formula Specification:</span>
            <div>• Area = (width_mm / 1000) * length_m</div>
            <div>• Film kg = Area * film_gsm / 1000</div>
            <div>• Dry Adhesive kg = Area * dry_adhesive_gsm / 1000</div>
            <div>• Liquid Adhesive kg = Dry Adhesive / (solids% / 100)</div>
            <div>• Net Tape kg = Film kg + Dry Adhesive kg</div>
          </div>
        </div>

        {/* Calculated Results Panel */}
        <div className="lg:col-span-7 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600" />
              Calculated BOM Requirements
            </h3>
            <span className="text-xs font-semibold text-slate-500 font-mono">
              Batch Scale: {rolls} {rolls === 1 ? "roll" : "rolls"}
            </span>
          </div>

          {bomResult?.summary && (
            <>
              {/* Batch Totals Grid */}
              <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
                  Total Requirements ({rolls} Rolls)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Total Area</span>
                    <span className="text-lg font-bold font-mono text-slate-900">
                      {bomResult.summary.areaTotalM2} m²
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50/50 rounded border border-amber-200">
                    <span className="text-[11px] text-amber-800 font-medium block">
                      Film Consumption
                    </span>
                    <span className="text-lg font-bold font-mono text-amber-900">
                      {bomResult.summary.filmTotalKg} kg
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50/50 rounded border border-amber-200">
                    <span className="text-[11px] text-amber-800 font-medium block">
                      Liquid Adhesive
                    </span>
                    <span className="text-lg font-bold font-mono text-amber-900">
                      {bomResult.summary.liquidAdhesiveTotalKg} kg
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Dry Adhesive Content</span>
                    <span className="text-lg font-bold font-mono text-slate-900">
                      {bomResult.summary.dryAdhesiveTotalKg} kg
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                    <span className="text-[11px] text-emerald-800 font-medium block">
                      Net Tape Weight
                    </span>
                    <span className="text-lg font-bold font-mono text-emerald-900">
                      {bomResult.summary.netTapeTotalKg} kg
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Cores Required</span>
                    <span className="text-lg font-bold font-mono text-slate-900">
                      {bomResult.summary.coresTotal} pcs
                    </span>
                  </div>
                </div>
              </div>

              {/* Per-Roll Verification Reference (Assessment Exact Check) */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                    Single Roll Reference Metrics (Per 1 Roll)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Assessment Dummy Verification
                  </span>
                </div>
                <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Area per roll:</span>
                    <span className="text-white font-bold">{bomResult.perRoll.areaPerRollM2} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Film consumption:</span>
                    <span className="text-amber-400 font-bold">{bomResult.perRoll.filmKgPerRoll} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dry adhesive weight:</span>
                    <span className="text-white font-bold">
                      {bomResult.perRoll.dryAdhesiveKgPerRoll} kg
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Liquid adhesive (at {solidsPercent}% solids):</span>
                    <span className="text-amber-400 font-bold">
                      {bomResult.perRoll.liquidAdhesiveKgPerRoll} kg
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1">
                    <span className="text-emerald-400">Net tape weight:</span>
                    <span className="text-emerald-400 font-bold">
                      {bomResult.perRoll.netTapeKgPerRoll} kg
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Core piece:</span>
                    <span className="text-white">{bomResult.perRoll.coresPerRoll} pc</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
