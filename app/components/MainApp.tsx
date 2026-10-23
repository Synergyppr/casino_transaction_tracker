"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  Plus,
  BarChart2,
  Settings,
  Loader2,
  UsersRound,
  Building2,
} from "lucide-react";
import type { Cashier, Player, ApiPlayer, Transaction } from "../lib/types";
import { TODAY } from "../lib/constants";
import { getPlayerTotals, getStatus } from "../lib/utils";
import { getAllPlayersApi } from "../lib/api";
import { DashboardView } from "./DashboardView";
import Sidebar from "./Sidebar";

export type View =
  | "dashboard"
  | "entry"
  | "players"
  | "monitoring"
  | "reports"
  | "admin"
  | "properties"
  | "audit";

// Dashboard View
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
  const [cashiers] = useState<Cashier[]>([]);
  const [apiPlayers, setApiPlayers] = useState<ApiPlayer[]>([]);
  const [selectedDate] = useState(TODAY);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Track session transactions locally (API doesn't have a list-by-player endpoint yet)
  const sessionTxnsRef = useRef<Map<string, Transaction[]>>(new Map());

  // Pure data fetch — returns data without setting state
  const fetchData = useCallback(async () => {
    const [playerData] = await Promise.all([getAllPlayersApi()]);

    const builtPlayers: Player[] = [];

    for (const apiP of playerData) {
      const localTxns = sessionTxnsRef.current.get(apiP.id) || [];

      {
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

    return { playerData, builtPlayers };
  }, [selectedDate]);

  // For child components to trigger a refresh
  const refreshData = useCallback(async () => {
    try {
      setError("");
      const { playerData, builtPlayers } = await fetchData();
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
      .then(({ playerData, builtPlayers }) => {
        if (!active) return;
        setApiPlayers(playerData);
        setPlayers(builtPlayers);

        // console.log("Initial data loaded:", {
        //   cashiers: cashierData,
        //   apiPlayers: playerData,
        //   players: builtPlayers,
        // });
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

  const canAdmin = user.role === "manager";
  const canReports = user.role === "manager" || user.role === "supervisor";

  const navItems: { id: View; icon: React.ElementType; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "entry", icon: Plus, label: "Daily Entry" },
    { id: "players", icon: UsersRound, label: "Registered Players" },
    ...(canReports
      ? [{ id: "reports" as View, icon: BarChart2, label: "Reports" }]
      : []),
    ...(canAdmin
      ? [
        { id: "admin" as View, icon: Settings, label: "Administration" },
        { id: "properties" as View, icon: Building2, label: "Properties" },
      ]
      : []),
  ];

  const monitoringPlayers = useMemo(
    () =>
      apiPlayers

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
            date: p.date || "",
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
      properties: "/property-management",
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
      <Sidebar
        sidebarOpen={sidebarOpen}
        handleNav={handleNav}
        activeView={
          pathname === "/" ? "dashboard" : (pathname.slice(1) as View)
        }
        navItems={navItems}
        complianceCount={complianceCount}
        user={user}
        logout={onLogout}
      />

      {/* Main */}
      <main className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
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
