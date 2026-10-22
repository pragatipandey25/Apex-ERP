"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, AlertCircle, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to authenticate.");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected login error occurred.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(userType: "admin" | "staff") {
    if (userType === "admin") {
      setEmail("admin@apexdemo.local");
      setPassword("Admin@ApexTape2026!");
    } else {
      setEmail("staff@apexdemo.local");
      setPassword("Staff@ApexTape2026!");
    }
    setError(null);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 mx-auto flex items-center justify-center font-bold text-white text-2xl shadow-card ring-1 ring-white/10">
          A
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
          Apex Tape Factory ERP
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Stock Management & Production Control System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card rounded-xl sm:px-10 border border-slate-200/80">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3.5 rounded-lg text-xs text-red-800 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="font-semibold text-xs">{error}</span>
              </div>
              {error.includes("Database connection") && (
                <div className="mt-2 pt-2 border-t border-red-200 text-xs text-red-700 space-y-1">
                  <p className="font-bold">How to resolve:</p>
                  <p>1. Start your local MySQL server (XAMPP, Windows Service, or Docker on port 3306).</p>
                  <p>2. Push the database schema: <code className="bg-red-100 px-1 py-0.5 rounded font-mono">npx prisma db push</code></p>
                  <p>3. Seed demo users: <code className="bg-red-100 px-1 py-0.5 rounded font-mono">npm run seed</code></p>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@apexdemo.local"
                className="mt-1.5 block w-full px-3.5 py-2 border border-slate-300 rounded-lg shadow-xs text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1.5 block w-full px-3.5 py-2 border border-slate-300 rounded-lg shadow-xs text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Assessment Demo Quick-Fill
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillDemo("staff")}
                className="p-2.5 border border-slate-200 rounded-lg text-left hover:bg-slate-50 hover:border-slate-300 transition-all text-xs group"
              >
                <span className="font-semibold text-slate-800 block group-hover:text-blue-600 transition-colors">
                  Operator (Staff)
                </span>
                <span className="text-slate-500 text-[11px] block mt-0.5">Permitted operations</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("admin")}
                className="p-2.5 border border-amber-200/80 bg-amber-50/30 rounded-lg text-left hover:bg-amber-50/70 hover:border-amber-300 transition-all text-xs"
              >
                <span className="font-semibold text-amber-900 block flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  Admin
                </span>
                <span className="text-amber-700/80 text-[11px] block mt-0.5">Audited corrections</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
