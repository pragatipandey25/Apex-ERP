"use client";

import { useRouter } from "next/navigation";
import { LogOut, UserCircle, Menu } from "lucide-react";

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    role: string;
  } | null;
  onMenuToggle?: () => void;
}

export function Header({ user, onMenuToggle }: HeaderProps) {
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

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <header className="h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
          Tape Factory Inventory & Production System
        </h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {user ? (
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2 text-right">
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-slate-900 leading-none">{user.name}</p>
                <p className="text-[11px] text-slate-500 mt-1">{user.email}</p>
              </div>

              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shadow-xs">
                {userInitial}
              </div>

              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                  user.role === "ADMIN"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                {user.role}
              </span>
            </div>

            <div className="h-5 w-px bg-slate-200 mx-0.5 sm:mx-1" />

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <UserCircle className="w-4 h-4" />
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
