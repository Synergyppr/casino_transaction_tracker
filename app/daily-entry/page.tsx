"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAllCashiers, getAllPlayersApi } from "../lib/api";
import type { Cashier, Player, ApiPlayer, Transaction } from "../lib/types";
import { TODAY } from "../lib/constants";
import {
  BarChart2,
  LayoutDashboard,
  Plus,
  Settings,
  UsersRound,
} from "lucide-react";
import { View } from "../components/MainApp";
import { getPlayerTotals, getStatus } from "../lib/utils";
import { DailyEntryView } from "../components/DailyEntryView";
import Sidebar from "../components/Sidebar";

const SESSION_KEY = "casino_session";
const TIMEOUT_MS = 60 * 60 * 1000;

function saveSession(cashier: Cashier) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        cashier,
        lastActivity: Date.now(),
      })
    );
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}

function loadSession(): Cashier | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    const cashier = parsed?.cashier;
    const lastActivity = parsed?.lastActivity;

    if (!cashier || !lastActivity) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    if (Date.now() - Number(lastActivity) > TIMEOUT_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    return cashier as Cashier;
  } catch (error) {
    console.error("Failed to load session:", error);

    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage cleanup errors
    }

    return null;
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error("Failed to clear session:", error);
  }
}

export default function Home() {
  // Track session transactions locally (API doesn't have a list-by-player endpoint yet)
  const sessionTxnsRef = useRef<Map<string, Transaction[]>>(new Map());

  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
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

      case "registered-players":
      case "registered%20players":
        return "players";

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
    /**
     * IMPORTANT:
     *
     * Do not redirect or show "Please log in..." until we've actually
     * checked sessionStorage.
     *
     * `user` starts as null on the first render, but that does NOT mean
     * the user is logged out yet.
     */
    const session = loadSession();

    setTimeout(() => {
      if (session) {
        setUser(session);
      } else {
        setUser(null);
      }

      setSessionChecked(true);
      setMounted(true);
    }, 0);
  }, []);

  const logout = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    clearSession();
    setUser(null);

    router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (!mounted || !sessionChecked || !user) return;

    function resetTimer() {
      saveSession(user as unknown as Cashier);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        logout();
      }, TIMEOUT_MS);
    }

    const events = ["mousedown", "keydown", "touchstart", "scroll"];

    events.forEach((e) => window.addEventListener(e, resetTimer));

    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [mounted, sessionChecked, user, logout]);

  const fetchData = useCallback(async () => {
    const [cashierData, playerData] = await Promise.all([
      getAllCashiers(),
      getAllPlayersApi(),
    ]);

    setCashiers(cashierData);

    // console.log("GET ALL CASHIERS:", cashierData);
    // console.log("GET ALL PLAYERS:", playerData);

    const builtPlayers: Player[] = [];

    for (const apiP of playerData) {
      const pDate = apiP.date ? apiP.date.split("T")[0] : "";
      const localTxns = sessionTxnsRef.current.get(apiP.id) || [];

      if (pDate === selectedDate || localTxns.length > 0) {
        builtPlayers.push({
          id: apiP.id,
          name: apiP.name || "Unknown",
          // date: selectedDate,
          date: apiP?.date,
          transactions: localTxns,
          createdBy: apiP.createdBy || "",
          gamerNumber: apiP.gamerNumber,
        });
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
    if (!mounted || !sessionChecked || !user) return;

    (async () => {
      await refreshData();
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mounted, sessionChecked]);

  useEffect(() => {
    /**
     * Only make an authentication decision AFTER sessionStorage
     * has been checked.
     *
     * Previously `user === null` during the initial render could
     * incorrectly behave like a real logged-out state.
     */
    if (!mounted || !sessionChecked) return;

    if (!user) {
      router.replace("/login");
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mounted, sessionChecked]);

  const canAdmin = user?.role === "supervisor" || user?.role === "manager";
  const canReports = user?.role === "manager" || user?.role === "supervisor";

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
          date: p.date?.split("T")[0] || selectedDate, // Ensure 'date' is included
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

  /**
   * Initial authentication/session loader.
   *
   * IMPORTANT:
   * This must happen BEFORE checking `!user`.
   *
   * `user` is intentionally null on the initial React render while
   * sessionStorage is being restored.
   */
  if (!mounted || !sessionChecked) {
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

  /**
   * Actual logged-out state.
   *
   * The redirect effect above will send the user to /login.
   * We render a loader while Next.js completes the route change instead
   * of incorrectly telling a valid user to log in again.
   */
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-72">
          <div className="text-center mb-10">
            <p className="text-sm text-muted-foreground">
              Redirecting to login...
            </p>
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
        activeView={activeView}
        navItems={navItems}
        complianceCount={complianceCount}
        user={user}
        logout={logout}
      />

      <main className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        <DailyEntryView
          players={players}
          setPlayers={setPlayers}
          user={user as Cashier}
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