"use client";

import { useRouter } from "next/navigation";
import { LogOut, UserCircle } from "lucide-react";

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">
          Tape Factory Inventory & Production System
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-right">
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-none">{user.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                  user.role === "ADMIN"
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-slate-100 text-slate-700 border border-slate-300"
                }`}
              >
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="flex items-center gap-2 text-sm text-slate-700 hover:text-amber-600"
          >
            <UserCircle className="w-5 h-5" />
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
