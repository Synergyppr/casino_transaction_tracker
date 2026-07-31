"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  Plus,
  BarChart2,
  Settings,
  LogOut,
  Shield,
  Loader2,
  UsersRound,
} from "lucide-react";
import type { Cashier, Player, ApiPlayer, Transaction } from "../lib/types";
import {
  // START_OF_TODAY,
  // END_OF_TODAY,
  END_OF_BUSINESS_DAY,
  START_OF_BUSINESS_DAY,
  TODAY,
} from "../lib/constants";import { getPlayerTotals, getStatus } from "../lib/utils";
import { getAllCashiers, getAllPlayersApi, getDailyReport } from "../lib/api";
import { DashboardView } from "./DashboardView";

export type View =
  | "dashboard"
  | "entry"
  | "players"
  | "monitoring"
  | "reports"
  | "admin"
  | "audit";

export function MainApp({
  user,
  onLogout,
}: {
  user: Cashier;
  onLogout: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [, setPlayers] = useState<Player[]>([]);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [apiPlayers, setApiPlayers] = useState<ApiPlayer[]>([]);
  const [selectedDate] = useState(TODAY);

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
      getDailyReport(START_OF_BUSINESS_DAY, END_OF_BUSINESS_DAY),
      // getDailyReport(START_OF_TODAY, END_OF_TODAY),
    ]);

    console.log("Fetched data:", {
      cashiers: cashierData,
      apiPlayers: playerData,
      dailyReport,
    });

    const builtPlayers: Player[] = [];

    if (dailyReport && dailyReport.playerDetail.length > 0) {
      for (const pd of dailyReport.playerDetail) {
        const apiP = playerData.find((p) => p.id === pd.playerId);

        // console.log("Building player:", playerData, pd, apiP);

        const txns: Transaction[] =
          pd.transactions?.map((t) => ({
            id: t.id,
            direction:
              t.direction === "outgoing"
                ? ("outgoing" as const)
                : ("incoming" as const),
            category: t.category || "Other",
            amount: t.amount,
            timestamp: "",
            cashierId: t.createdByCashierId || "",
            playerName: t.playerName,
            cashierName: t.cashierName,
          })) || [];

        // console.log("Building player:", playerData, pd, apiP);

        builtPlayers.push({
          id: pd.playerId,
          name: pd.playerName || apiP?.name || "Unknown",
          date: selectedDate,
          transactions: txns,
          createdBy: dailyReport?.createdBy || "",
        });
      }
    } else {
      for (const apiP of playerData) {
        const pDate = apiP.date ? apiP.date.split("T")[0] : "";
        const localTxns = sessionTxnsRef.current.get(apiP.id) || [];

        // console.log("Building player:", playerData, apiP);

        if (pDate === selectedDate || localTxns.length > 0) {
          builtPlayers.push({
            id: apiP.id,
            name: apiP.name || "Unknown",
            date: selectedDate,
            transactions: localTxns,
            createdBy: apiP.createdBy || "",
            gamerNumber: apiP.gamerNumber,
          });
        }
      }
    }

    return { cashierData, playerData, builtPlayers };
  }, [selectedDate]);

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

        console.log("Initial data loaded:", {
          cashiers: cashierData,
          apiPlayers: playerData,
          players: builtPlayers,
        });
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchData]);

  const canAdmin = user.role === "supervisor" || user.role === "manager";
  const canReports = user.role === "manager" || user.role === "supervisor";

  const navItems: { id: View; icon: React.ElementType; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "entry", icon: Plus, label: "Daily Entry" },
    { id: "players", icon: UsersRound, label: "Registered Players" },
    ...(canReports
      ? [{ id: "reports" as View, icon: BarChart2, label: "Reports" }]
      : []),
    ...(canAdmin
      ? [{ id: "admin" as View, icon: Settings, label: "Administration" }]
      : []),
  ];

  const monitoringPlayers = useMemo(
    () =>
      apiPlayers
        .filter((p) => p.date?.split("T")[0] === selectedDate)
        .map((p) => ({
          id: p.id,
          name: p.name || "Unknown",
          date: p.date?.split("T")[0] || selectedDate,
          transactions: (p.transactions || []).map((t) => ({
            id: t.id,
            direction:
              t.direction === "outgoing"
                ? ("outgoing" as const)
                : ("incoming" as const),
            category: t.category || "Other",
            amount: Number(t.amount) || 0,
            timestamp: p.date || "",
            cashierId: p.createdBy || "",
          })),
          createdBy: p.createdBy || "",
          gamerNumber: p.gamerNumber,
        })),
    [apiPlayers, selectedDate]
  );

  const complianceCount = monitoringPlayers.filter((p) => {
    const { incoming, outgoing } = getPlayerTotals(p);
    return getStatus(incoming, outgoing) === "compliance";
  }).length;

  function handleNav(item: {
    id: View;
    icon: React.ElementType;
    label: string;
  }) {
    const routes: Partial<Record<View, string>> = {
      dashboard: "/",
      entry: "/daily-entry",
      players: "/registered-players",
      reports: "/reports",
      admin: "/administration",
    };

    setSidebarOpen(false);
    router.push(routes[item.id] || "/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-72">
          <div className="text-center mb-10">
            <Loader2
              size={24}
              className="animate-spin text-accent mx-auto mb-3"
            />
            <p className="text-sm text-muted-foreground">Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen bg-background flex overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky lg:top-0 z-50 top-0 left-0 h-screen lg:h-screen w-52 bg-[#0a0e18] border-r border-border flex flex-col shrink-0 transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-accent shrink-0" />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Casino del Mar
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            Player Tracking
          </p>
        </div>

        <nav className="flex-1 p-2.5 space-y-0.5 overflow-auto">
          {navItems?.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-sm transition-colors cursor-pointer ${
                item.label.toLowerCase() === "dashboard" && pathname === "/"
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
            <p className="text-xs text-muted-foreground capitalize font-mono">
              {user.role}
            </p>
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
      <main className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-12 border-b border-border flex items-center justify-between px-4 sm:px-5 shrink-0 bg-card/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <h2 className="text-sm font-semibold text-foreground">
              {navItems.find((n) => n.id === "dashboard")?.label}
            </h2>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-medium">Live</span>
            </div>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-3 p-3 bg-destructive/10 border border-destructive/25 rounded text-xs text-destructive">
            {error}
            <button
              onClick={() => {
                setError("");
                refreshData();
              }}
              className="ml-3 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Page */}
        <div className="flex-1 overflow-auto scrollbar-thin [scrollbar-color:var(--color-border)_transparent]">
          <DashboardView
            players={apiPlayers
              .filter((p) => {
                const [datePart] = p.date.split(" ");
                const [month, day, year] = datePart.split("/");

                const formattedDate = `${year}-${month.padStart(
                  2,
                  "0"
                )}-${day.padStart(2, "0")}`;

                return formattedDate === selectedDate;
              })
              .map((p) => ({
                id: p.id,
                name: p.name || "Unknown",
                date: p.date || TODAY,
                transactions: (p.transactions || []).map((t) => ({
                  id: t.id,
                  direction:
                    t.direction === "outgoing"
                      ? ("outgoing" as const)
                      : ("incoming" as const),
                  category: t.category || "Other",
                  amount: Number(t.amount) || 0,
                  timestamp: t.timestamp || "",
                  cashierId: t.createdBy || "",
                  playerName: t.playerName || "Unknown",
                  cashierName: t.cashierName || "Unknown",
                })),
                createdBy: p.createdBy || "",
                gamerNumber: p.gamerNumber,
              }))}
            cashiers={cashiers}
            selectedDate={TODAY}
          />
        </div>
      </main>
    </div>
  );
}
