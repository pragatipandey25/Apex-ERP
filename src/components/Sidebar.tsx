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
  X,
} from "lucide-react";

interface SidebarProps {
  userRole?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ userRole, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const operationsNav = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Tape Specifications", href: "/specifications", icon: Layers },
    { name: "BOM Calculator", href: "/bom-calculator", icon: Calculator },
  ];

  const inventoryNav = [
    { name: "Raw Materials", href: "/inventory/raw-materials", icon: Boxes },
    { name: "Production Batches", href: "/production", icon: Factory },
    { name: "Finished Goods", href: "/inventory/finished-goods", icon: PackageCheck },
  ];

  const commercialNav = [
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Orders & Reservations", href: "/orders", icon: ShoppingCart },
    { name: "Dispatches", href: "/dispatches", icon: Truck },
  ];

  const governanceNav = [
    { name: "Transaction History", href: "/history", icon: History },
    {
      name: "Admin Corrections",
      href: "/admin/corrections",
      icon: ShieldAlert,
      adminOnly: true,
    },
  ];

  const renderNavGroup = (title: string, items: typeof operationsNav) => (
    <div className="space-y-1">
      <div className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400/90">
        {title}
      </div>
      {items.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        const isAdminItem = (item as any).adminOnly;

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => {
              if (onClose) onClose();
            }}
            className={`group flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 ${
              isActive
                ? "bg-blue-600/15 text-white font-semibold border border-blue-500/30 shadow-xs"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Icon
              className={`w-4 h-4 transition-colors ${
                isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
              }`}
            />
            <span className="flex-1 truncate">{item.name}</span>
            {isAdminItem && (
              <span
                className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold tracking-wider ${
                  isActive
                    ? "bg-red-500/20 text-red-200 border border-red-500/40"
                    : "bg-red-950/60 text-red-300 border border-red-800/60"
                }`}
              >
                Admin
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  const sidebarContent = (
    <>
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-base shadow-xs ring-1 ring-white/10 flex-shrink-0">
            A
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-100 tracking-wider text-sm block leading-tight truncate">
              APEX TAPE
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-blue-400 font-semibold leading-tight mt-0.5">
              Factory ERP
            </span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">
        {renderNavGroup("Operations", operationsNav)}
        {renderNavGroup("Inventory & Goods", inventoryNav)}
        {renderNavGroup("Commercial", commercialNav)}
        {renderNavGroup("Governance", governanceNav)}
      </nav>

      {/* Active Role Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/30">
        <div className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px] font-medium">Session Role</span>
          <span
            className={`font-semibold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase ${
              userRole === "ADMIN"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
            }`}
          >
            {userRole || "GUEST"}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Static Sidebar (Visible on screens >= lg) */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-200 min-h-screen flex-col border-r border-slate-800/80 select-none flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-Out Drawer (Visible on screens < lg when isOpen) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 shadow-2xl transition-transform duration-200 ease-in-out lg:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
