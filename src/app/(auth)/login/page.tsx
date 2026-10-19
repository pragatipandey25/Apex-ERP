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
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-lg bg-amber-500 mx-auto flex items-center justify-center font-black text-slate-950 text-2xl shadow-lg">
          A
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
          Apex Tape Factory ERP
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Stock Management & Production Control System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-lg sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3.5 rounded text-sm text-red-800 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
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
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 transition-colors"
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

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
              Technical Assessment Demo Logins
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("staff")}
                className="p-2 border border-slate-300 rounded text-left hover:bg-slate-50 transition-colors text-xs"
              >
                <span className="font-bold text-slate-800 block">Operator (Staff)</span>
                <span className="text-slate-500 text-[11px] block">Permitted operations</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("admin")}
                className="p-2 border border-amber-300 bg-amber-50/50 rounded text-left hover:bg-amber-100/50 transition-colors text-xs"
              >
                <span className="font-bold text-amber-900 block flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  Admin
                </span>
                <span className="text-amber-800 text-[11px] block">Audited corrections</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
