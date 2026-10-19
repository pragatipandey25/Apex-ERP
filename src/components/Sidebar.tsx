"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Calculator,
  Boxes,
  Factory,
  PackageCheck,
  Users,
  ShoppingCart,
  Truck,
  History,
  ShieldAlert,
} from "lucide-react";

interface SidebarProps {
  userRole?: string;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Tape Specifications", href: "/specifications", icon: Layers },
    { name: "BOM Calculator", href: "/bom-calculator", icon: Calculator },
    { name: "Raw Materials", href: "/inventory/raw-materials", icon: Boxes },
    { name: "Production Batches", href: "/production", icon: Factory },
    { name: "Finished Goods", href: "/inventory/finished-goods", icon: PackageCheck },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Orders & Reservations", href: "/orders", icon: ShoppingCart },
    { name: "Dispatches", href: "/dispatches", icon: Truck },
    { name: "Transaction History", href: "/history", icon: History },
    {
      name: "Admin Corrections",
      href: "/admin/corrections",
      icon: ShieldAlert,
      adminOnly: true,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 min-h-screen flex flex-col border-r border-slate-800">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center font-bold text-slate-950 text-lg">
          A
        </div>
        <div>
          <span className="font-bold text-white tracking-wider text-base">APEX TAPE</span>
          <span className="block text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
            Factory ERP
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Operations
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-amber-500 text-slate-950 font-semibold"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
              <span className="flex-1">{item.name}</span>
              {item.adminOnly && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${
                    isActive
                      ? "bg-slate-950 text-amber-400"
                      : "bg-red-950 text-red-300 border border-red-800"
                  }`}
                >
                  Admin
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span>Active Role:</span>
          <span
            className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
              userRole === "ADMIN"
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                : "bg-blue-400/20 text-blue-300 border border-blue-400/30"
            }`}
          >
            {userRole || "GUEST"}
          </span>
        </div>
      </div>
    </aside>
  );
}
