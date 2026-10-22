"use client";

import { useEffect, useState } from "react";
import {
  Factory,
  Plus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  History,
  Scale,
  Sparkles,
  Info,
} from "lucide-react";

export default function ProductionPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [specs, setSpecs] = useState<any[]>([]);
  const [materialBalances, setMaterialBalances] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batchNumber, setBatchNumber] = useState(`BATCH-${Date.now().toString().slice(-6)}`);
  const [productionDate, setProductionDate] = useState(new Date().toISOString().slice(0, 10));
  const [specificationId, setSpecificationId] = useState("");
  const [wholeRolls, setWholeRolls] = useState("10");
  const [filmIssuedKg, setFilmIssuedKg] = useState("");
  const [liquidAdhesiveIssuedKg, setLiquidAdhesiveIssuedKg] = useState("");
  const [dryWastageKg, setDryWastageKg] = useState("0.000");
  const [notes, setNotes] = useState("");

  // Live BOM & Balance validation
  const [liveBom, setLiveBom] = useState<any>(null);
  const [balanceStatus, setBalanceStatus] = useState<{
    valid: boolean;
    lhs: number;
    rhs: number;
    diff: number;
    error?: string;
  } | null>(null);

  async function loadInitialData() {
    setLoading(true);
    try {
      const [batchesRes, specsRes, matsRes] = await Promise.all([
        fetch("/api/production/batches"),
        fetch("/api/specifications"),
        fetch("/api/inventory/materials"),
      ]);

      const [batchesData, specsData, matsData] = await Promise.all([
        batchesRes.json(),
        specsRes.json(),
        matsRes.json(),
      ]);

      if (batchesData.batches) setBatches(batchesData.batches);
      if (specsData.specifications) {
        setSpecs(specsData.specifications);
        if (specsData.specifications.length > 0 && !specificationId) {
          setSpecificationId(specsData.specifications[0].id);
        }
      }
      if (matsData.balances) setMaterialBalances(matsData.balances);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  // Recalculate BOM when spec or rolls change
  useEffect(() => {
    if (!specificationId || !wholeRolls) return;
    const spec = specs.find((s) => s.id === specificationId);
    if (!spec) return;

    const rollsCount = parseInt(wholeRolls) || 0;
    if (rollsCount <= 0) return;

    fetch("/api/bom/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        widthMm: parseFloat(spec.widthMm),
        filmGsm: parseFloat(spec.filmGsm),
        dryAdhesiveGsm: parseFloat(spec.dryAdhesiveGsm),
        adhesiveSolidsPercent: parseFloat(spec.adhesiveSolidsPercent),
        rollLengthM: parseFloat(spec.rollLengthM),
        rolls: rollsCount,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) {
          setLiveBom(data.summary);
        }
      })
      .catch((e) => console.error("BOM error:", e));
  }, [specificationId, wholeRolls, specs]);

  // Check production equation live
  useEffect(() => {
    const spec = specs.find((s) => s.id === specificationId);
    if (!spec || !liveBom) {
      setBalanceStatus(null);
      return;
    }

    const film = parseFloat(filmIssuedKg) || 0;
    const adhesive = parseFloat(liquidAdhesiveIssuedKg) || 0;
    const wastage = parseFloat(dryWastageKg) || 0;
    const solidsFraction = parseFloat(spec.adhesiveSolidsPercent) / 100;
    const netTapeExpected = parseFloat(liveBom.netTapeTotalKg) || 0;

    // LHS = film_issued + adhesive_issued * solidsFraction
    const lhs = film + adhesive * solidsFraction;
    // RHS = net_tape_produced + dry_wastage
    const rhs = netTapeExpected + wastage;
    const diff = lhs - rhs;

    const tolerance = 0.002;
    const valid = Math.abs(diff) <= tolerance;

    setBalanceStatus({
      valid,
      lhs,
      rhs,
      diff,
      error: valid
        ? undefined
        : `Signed diff: ${diff > 0 ? "+" : ""}${diff.toFixed(
            4
          )} kg. LHS (Input Solids: ${lhs.toFixed(3)} kg) ≠ RHS (Output Solids: ${rhs.toFixed(3)} kg)`,
    });
  }, [filmIssuedKg, liquidAdhesiveIssuedKg, dryWastageKg, liveBom, specificationId, specs]);

  function autoFillExactBOM() {
    if (!liveBom) return;
    setFilmIssuedKg(liveBom.filmTotalKg);
    setLiquidAdhesiveIssuedKg(liveBom.liquidAdhesiveTotalKg);
    setDryWastageKg("0.000");
  }

  async function handleBatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const idempotencyKey = `BATCH-KEY-${batchNumber}-${Date.now()}`;
      const res = await fetch("/api/production/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          batchNumber,
          productionDate,
          specificationId,
          wholeRolls: parseInt(wholeRolls),
          filmIssuedKg: parseFloat(filmIssuedKg),
          liquidAdhesiveIssuedKg: parseFloat(liquidAdhesiveIssuedKg),
          dryWastageKg: parseFloat(dryWastageKg),
          notes,
          idempotencyKey,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        if (resJson.shortageDetails) {
          throw new Error(
            `${resJson.error} (Available: ${resJson.shortageDetails.availableQuantity}, Shortage: ${resJson.shortageDetails.shortageQuantity})`
          );
        }
        throw new Error(resJson.error || "Failed to post production batch");
      }

      setSuccess(`Production batch '${batchNumber}' successfully executed and posted to inventory.`);
      setShowForm(false);
      setBatchNumber(`BATCH-${Date.now().toString().slice(-6)}`);
      setFilmIssuedKg("");
      setLiquidAdhesiveIssuedKg("");
      setDryWastageKg("0.000");
      setNotes("");
      loadInitialData();
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Production Management</h2>
          <p className="text-sm text-slate-500">
            Coating batch execution with exact mass-balance equation validation and atomic material deductions
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded hover:bg-amber-400 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Post New Production Batch"}
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

      {/* Production Batch Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-slate-300 shadow-md p-6 animate-fadeIn space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Factory className="w-5 h-5 text-amber-500" />
              Production Batch Execution
            </h3>
            <button
              type="button"
              onClick={autoFillExactBOM}
              disabled={!liveBom}
              className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded font-semibold border border-amber-300 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Auto-fill Theoretical BOM Values
            </button>
          </div>

          <form onSubmit={handleBatchSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Batch Number
                </label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Production Date
                </label>
                <input
                  type="date"
                  required
                  value={productionDate}
                  onChange={(e) => setProductionDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm"
                />
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Whole Rolls Produced
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={wholeRolls}
                  onChange={(e) => setWholeRolls(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border-2 border-amber-400 bg-amber-50/20 rounded text-sm font-mono font-bold"
                />
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  1 Core consumed per roll ({wholeRolls || 0} cores required)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Film Issued (kg)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  placeholder={liveBom ? `Expected: ${liveBom.filmTotalKg}` : "0.000"}
                  value={filmIssuedKg}
                  onChange={(e) => setFilmIssuedKg(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono"
                />
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Available in stock: {materialBalances?.filmKg || "0.000"} kg
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Liquid Adhesive Issued (kg)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  placeholder={liveBom ? `Expected: ${liveBom.liquidAdhesiveTotalKg}` : "0.000"}
                  value={liquidAdhesiveIssuedKg}
                  onChange={(e) => setLiquidAdhesiveIssuedKg(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono"
                />
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Available in stock: {materialBalances?.liquidAdhesiveKg || "0.000"} kg
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Dry Wastage (kg)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={dryWastageKg}
                  onChange={(e) => setDryWastageKg(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono"
                />
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Dry scrap/edge trim (can be 0.000)
                </span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Production Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Line 2 morning shift, operator John"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm"
                />
              </div>
            </div>

            {/* Live Production Equation Status Box */}
            <div
              className={`p-4 rounded-lg border text-xs space-y-1.5 ${
                balanceStatus?.valid
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-red-50 border-red-300 text-red-900"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Scale className="w-4 h-4" />
                  Mandatory Mass Balance Equation Status:{" "}
                  {balanceStatus?.valid ? "VERIFIED (BALANCED)" : "MISMATCH (REJECTED)"}
                </span>
                <span className="font-mono">Tolerance: ±0.002 kg</span>
              </div>
              <div className="font-mono pt-1">
                film_issued + (liquid_adhesive * solids%) = net_tape_produced + dry_wastage
              </div>
              {balanceStatus && (
                <div className="font-mono">
                  LHS ({balanceStatus.lhs.toFixed(3)} kg) = RHS ({balanceStatus.rhs.toFixed(3)} kg)
                  {"  "}•{"  "}Signed Difference: {balanceStatus.diff > 0 ? "+" : ""}
                  {balanceStatus.diff.toFixed(4)} kg
                </div>
              )}
              {balanceStatus?.error && (
                <div className="font-semibold text-red-700 mt-1">{balanceStatus.error}</div>
              )}
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
                disabled={submitting || (balanceStatus ? !balanceStatus.valid : false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded text-xs inline-flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Post Batch & Deduct Inventory
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Production History Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Historical Production Batches
          </h3>
          <span className="text-xs text-slate-500">{batches.length} batches committed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Batch #</th>
                <th className="px-4 py-3">Specification</th>
                <th className="px-4 py-3">Rolls</th>
                <th className="px-4 py-3">Film Issued</th>
                <th className="px-4 py-3">Adhesive Issued</th>
                <th className="px-4 py-3">Dry Wastage</th>
                <th className="px-4 py-3">Theoretical Net Kg</th>
                <th className="px-4 py-3">Balance Diff</th>
                <th className="px-4 py-3">Operator</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading batches...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No production batches executed yet. Receive raw materials first to begin.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {b.specification?.code || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-700">
                      {b.wholeRolls} rolls
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {parseFloat(b.filmIssuedKg).toFixed(3)} kg
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {parseFloat(b.liquidAdhesiveIssuedKg).toFixed(3)} kg
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {parseFloat(b.dryWastageKg).toFixed(3)} kg
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                      {parseFloat(b.theoreticalNetTapeKg).toFixed(3)} kg
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {parseFloat(b.balanceDifferenceKg).toFixed(4)} kg
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.user?.name || "System"}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(b.productionDate).toLocaleDateString()}
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
