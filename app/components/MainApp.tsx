"use client";

import { useState, useMemo } from "react";
import {
  LayoutDashboard,
  Plus,
  Activity,
  BarChart2,
  Settings,
  ClipboardList,
  LogOut,
  Shield,
} from "lucide-react";
import type { Cashier, Player } from "../lib/types";
import { SEED_CASHIERS, TODAY, getSeedPlayers } from "../lib/constants";
import { getPlayerTotals, getStatus, fmtDate } from "../lib/utils";
import { DashboardView } from "./DashboardView";
import { DailyEntryView } from "./DailyEntryView";
import { MonitoringView } from "./MonitoringView";
import { ReportsView } from "./ReportsView";
import { AdminView } from "./AdminView";
import { AuditView } from "./AuditView";

type View = "dashboard" | "entry" | "monitoring" | "reports" | "admin" | "audit";

export function MainApp({ user, onLogout }: { user: Cashier; onLogout: () => void }) {
  const [view, setView] = useState<View>("dashboard");
  const [players, setPlayers] = useState<Player[]>(getSeedPlayers);
  const [cashiers, setCashiers] = useState<Cashier[]>(SEED_CASHIERS);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const todayPlayers = useMemo(() => players.filter((p) => p.date === TODAY), [players]);

  const canAdmin = user.role === "supervisor" || user.role === "manager";
  const canReports = user.role === "manager" || user.role === "supervisor";

  const navItems: { id: View; icon: React.ElementType; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "entry", icon: Plus, label: "Daily Entry" },
    { id: "monitoring", icon: Activity, label: "Monitoring" },
    ...(canReports ? [{ id: "reports" as View, icon: BarChart2, label: "Reports" }] : []),
    ...(canAdmin ? [{ id: "admin" as View, icon: Settings, label: "Administration" }] : []),
    { id: "audit", icon: ClipboardList, label: "Audit Log" },
  ];

  const complianceCount = todayPlayers.filter((p) => {
    const { incoming, outgoing } = getPlayerTotals(p);
    return getStatus(incoming, outgoing) === "compliance";
  }).length;

  function handleNav(id: View) {
    setView(id);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-50 top-0 left-0 h-full w-52 bg-[#0a0e18] border-r border-border flex flex-col shrink-0 transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-accent shrink-0" />
            <span className="text-sm font-semibold tracking-tight text-foreground">Casino del Mar</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">Player Tracking</p>
        </div>

        <nav className="flex-1 p-2.5 space-y-0.5 overflow-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-sm transition-colors ${
                view === item.id
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon size={14} />
              <span>{item.label}</span>
              {item.id === "monitoring" && complianceCount > 0 && (
                <span className="ml-auto text-xs font-mono bg-emerald-500/20 text-emerald-400 px-1.5 rounded-sm">
                  {complianceCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-2.5 border-t border-border">
          <div className="px-2.5 py-2 mb-1">
            <p className="text-xs font-semibold text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize font-mono">{user.role}</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-12 border-b border-border flex items-center justify-between px-4 sm:px-5 shrink-0 bg-card/50">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h2 className="text-sm font-semibold text-foreground">
              {navItems.find((n) => n.id === view)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-5">
            <span className="text-xs text-muted-foreground font-mono hidden sm:block">{fmtDate(TODAY)}</span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </div>
          </div>
        </header>

        {/* Page */}
        <div className="flex-1 overflow-auto [scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent]">
          {view === "dashboard" && (
            <DashboardView players={todayPlayers} cashiers={cashiers} />
          )}
          {view === "entry" && (
            <DailyEntryView players={players} setPlayers={setPlayers} user={user} />
          )}
          {view === "monitoring" && <MonitoringView players={todayPlayers} />}
          {view === "reports" && canReports && (
            <ReportsView players={players} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
          )}
          {view === "admin" && canAdmin && (
            <AdminView cashiers={cashiers} setCashiers={setCashiers} user={user} />
          )}
          {view === "audit" && <AuditView players={players} cashiers={cashiers} />}
        </div>
      </main>
    </div>
  );
}
