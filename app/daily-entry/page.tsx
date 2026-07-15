"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAllCashiers, getAllPlayersApi, getDailyReport } from "../lib/api";
import type { Cashier, Player, ApiPlayer, Transaction } from "../lib/types";
import { END_OF_TODAY, START_OF_TODAY, TODAY } from "../lib/constants";
import { LoginScreen } from "../components/LoginScreen";
import {
  BarChart2,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Shield,
} from "lucide-react";
import { View } from "../components/MainApp";
import { getPlayerTotals, getStatus } from "../lib/utils";
import { DailyEntryView } from "../components/DailyEntryView";

const SESSION_KEY = "casino_session";
const TIMEOUT_MS = 60 * 60 * 1000;

function saveSession(cashier: Cashier) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ cashier, lastActivity: Date.now() })
  );
}

function loadSession(): Cashier | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { cashier, lastActivity } = JSON.parse(raw);
    if (Date.now() - lastActivity > TIMEOUT_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return cashier;
  } catch {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export default function Home() {
  // Track session transactions locally (API doesn't have a list-by-player endpoint yet)
  const sessionTxnsRef = useRef<Map<string, Transaction[]>>(new Map());

  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<Cashier | null>(null);
  const [, setCashiers] = useState<Cashier[]>([]);
  const [apiPlayers, setApiPlayers] = useState<ApiPlayer[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [, setError] = useState<string>("");
  const activeView = useMemo<View>(() => {
    const pathSegment = pathname.split("/")[1]?.toLowerCase();

    switch (pathSegment) {
      case "daily-entry":
      case "daily%20entry":
      case "entry":
        return "entry";

      case "reports":
        return "reports";

      case "administration":
      case "admin":
        return "admin";

      default:
        return "dashboard";
    }
  }, [pathname]);

  //   const [selectedDate, setSelectedDate] = useState<string>(TODAY);
  const selectedDate = TODAY; // Use a constant for the selected date since it's not being changed in this code snippet

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function initializeSession() {
      const session = loadSession();
      setUser(session);
      setMounted(true);
    }
    initializeSession();
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const handleLogin = useCallback((cashier: Cashier) => {
    saveSession(cashier);
    setUser(cashier);
  }, []);

  useEffect(() => {
    if (!mounted || !user) return;

    function resetTimer() {
      saveSession(user!);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, TIMEOUT_MS);
    }

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mounted, user, logout]);

  const fetchData = useCallback(async () => {
    const [cashierData, playerData, dailyReport] = await Promise.all([
      getAllCashiers(),
      getAllPlayersApi(),
      getDailyReport(START_OF_TODAY, END_OF_TODAY),
    ]);

    setCashiers(cashierData);

    const builtPlayers: Player[] = [];

    if (dailyReport && dailyReport.playerDetail.length > 0) {
      for (const pd of dailyReport.playerDetail) {
        const apiP = playerData.find((p) => p.id === pd.playerId);

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

  // Trigger a refresh
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

  useEffect(() => {
    if (!user) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const canAdmin = user?.role === "supervisor" || user?.role === "manager";
  const canReports = user?.role === "manager" || user?.role === "supervisor";

  const navItems: { id: View; icon: React.ElementType; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "entry", icon: Plus, label: "Daily Entry" },
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
      reports: "/reports",
      admin: "/administration",
    };

    setSidebarOpen(false);
    router.push(routes[item.id] || "/");
  }

  // Helper: track a session transaction (players state is already updated by DailyEntryView)
  const addSessionTransaction = useCallback(
    (playerId: string, txn: Transaction) => {
      const existing = sessionTxnsRef.current.get(playerId) || [];
      sessionTxnsRef.current.set(playerId, [...existing, txn]);
    },
    []
  );

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-72">
          <div className="text-center mb-10">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />;

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
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-sm transition-colors cursor-pointer ${
                activeView === item.id
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
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        <DailyEntryView
          players={players}
          setPlayers={setPlayers}
          user={user}
          apiPlayers={apiPlayers}
          onDataChange={refreshData}
          onTransactionCreated={addSessionTransaction}
          selectedDate={TODAY}
          logout={logout}
        />
      </main>
    </div>
  );
}
