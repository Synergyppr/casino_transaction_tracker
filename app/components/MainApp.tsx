"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard,
  Plus,
  Activity,
  BarChart2,
  Settings,
  ClipboardList,
  LogOut,
  Shield,
  Loader2,
} from "lucide-react";
import type { Cashier, Player, ApiPlayer, Transaction } from "../lib/types";
import { TODAY } from "../lib/constants";
import { getPlayerTotals, getStatus, fmtDate } from "../lib/utils";
import { getAllCashiers, getAllPlayersApi, getDailyReport } from "../lib/api";
import { DashboardView } from "./DashboardView";
import { DailyEntryView } from "./DailyEntryView";
import { MonitoringView } from "./MonitoringView";
import { ReportsView } from "./ReportsView";
import { AdminView } from "./AdminView";
import { AuditView } from "./AuditView";

type View = "dashboard" | "entry" | "monitoring" | "reports" | "admin" | "audit";

export function MainApp({ user, onLogout }: { user: Cashier; onLogout: () => void }) {
  const [view, setView] = useState<View>("dashboard");
  const [players, setPlayers] = useState<Player[]>([]);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [apiPlayers, setApiPlayers] = useState<ApiPlayer[]>([]);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Track session transactions locally (API doesn't have a list-by-player endpoint yet)
  const sessionTxnsRef = useRef<Map<string, Transaction[]>>(new Map());

  // Pure data fetch — returns data without setting state
  const fetchData = useCallback(async () => {
    const [cashierData, playerData, dailyReport] = await Promise.all([
      getAllCashiers(),
      getAllPlayersApi(),
      getDailyReport(TODAY),
    ]);

    // Build players: use daily report playerDetail if available, else use session transactions
    const builtPlayers: Player[] = [];

    if (dailyReport && dailyReport.playerDetail.length > 0) {
      for (const pd of dailyReport.playerDetail) {
        const apiP = playerData.find((p) => p.id === pd.playerId);
        const txns: Transaction[] = pd.transactions?.map((t) => ({
          id: t.id,
          direction: t.direction === "outgoing" ? "outgoing" as const : "incoming" as const,
          category: t.category || "Other",
          amount: t.amount,
          timestamp: "",
          cashierId: t.createdByCashierId || "",
          playerName: t.playerName,
          cashierName: t.cashierName,
        })) || [];

        builtPlayers.push({
          id: pd.playerId,
          name: pd.playerName || apiP?.name || "Unknown",
          date: TODAY,
          transactions: txns,
          createdBy: txns[0]?.cashierId || "",
        });
      }
    } else {
      for (const apiP of playerData) {
        const pDate = apiP.date ? apiP.date.split("T")[0] : "";
        const localTxns = sessionTxnsRef.current.get(apiP.id) || [];
        if (pDate === TODAY || localTxns.length > 0) {
          builtPlayers.push({
            id: apiP.id,
            name: apiP.name || "Unknown",
            date: TODAY,
            transactions: localTxns,
            createdBy: apiP.createdBy || "",
            gamerNumber: apiP.gamerNumber,
          });
        }
      }
    }

    return { cashierData, playerData, builtPlayers };
  }, []);

  // For child components to trigger a refresh
  const refreshData = useCallback(async () => {
    try {
      setError("");
      const { cashierData, playerData, builtPlayers } = await fetchData();
      setCashiers(cashierData);
      setApiPlayers(playerData);
      setPlayers(builtPlayers);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
  }, [fetchData]);

  // Initial load — setState in .then() callbacks (React-recommended pattern)
  useEffect(() => {
    let active = true;
    fetchData()
      .then(({ cashierData, playerData, builtPlayers }) => {
        if (!active) return;
        setCashiers(cashierData);
        setApiPlayers(playerData);
        setPlayers(builtPlayers);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [fetchData]);

  // Helper: track a session transaction (players state is already updated by DailyEntryView)
  const addSessionTransaction = useCallback((playerId: string, txn: Transaction) => {
    const existing = sessionTxnsRef.current.get(playerId) || [];
    sessionTxnsRef.current.set(playerId, [...existing, txn]);
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={24} className="animate-spin text-accent mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading data...</p>
        </div>
      </div>
    );
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

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-3 p-3 bg-destructive/10 border border-destructive/25 rounded text-xs text-destructive">
            {error}
            <button onClick={() => { setError(""); refreshData(); }} className="ml-3 underline">
              Retry
            </button>
          </div>
        )}

        {/* Page */}
        <div className="flex-1 overflow-auto scrollbar-thin [scrollbar-color:var(--color-border)_transparent]">
          {view === "dashboard" && (
            <DashboardView players={todayPlayers} cashiers={cashiers} />
          )}
          {view === "entry" && (
            <DailyEntryView
              players={players}
              setPlayers={setPlayers}
              user={user}
              apiPlayers={apiPlayers}
              onDataChange={refreshData}
              onTransactionCreated={addSessionTransaction}
            />
          )}
          {view === "monitoring" && <MonitoringView players={todayPlayers} />}
          {view === "reports" && canReports && (
            <ReportsView
              players={players}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              apiPlayers={apiPlayers}
            />
          )}
          {view === "admin" && canAdmin && (
            <AdminView cashiers={cashiers} setCashiers={setCashiers} user={user} onDataChange={refreshData} />
          )}
          {view === "audit" && <AuditView players={players} cashiers={cashiers} />}
        </div>
      </main>
    </div>
  );
}
