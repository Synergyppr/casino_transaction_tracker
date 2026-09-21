"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Cashier } from "../lib/types";
import { TODAY } from "../lib/constants";
import {
  BarChart2,
  LayoutDashboard,
  Plus,
  Settings,
  UsersRound,
} from "lucide-react";
import { View } from "../components/MainApp";
import { ReportsView } from "../components/ReportsView";

import Sidebar from "../components/Sidebar";

const SESSION_KEY = "casino_session";
const TIMEOUT_MS = 60 * 60 * 1000; // 

export interface ReportData {
  players: number;
  transactions: number;
  totalIncoming: number;
  totalOutgoing: number;
  net: number;
  complianceAlerts: number;
  playerDetail: {
    playerId: string;
    playerName: string;
    transactions: number;
    incoming: number;
    outgoing: number;
    net: number;
    complianceStatus: string;
  }[];
}

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
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<Cashier | null>(null);
  const [report, setReport] = useState<ReportData>();

  const today = new Date();

  const YESTERDAY = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();

  // const THIRTY_DAYS_AGO = (() => {
  //   const d = new Date(today);
  //   d.setDate(d.getDate() - 30);
  //   return d.toISOString().split("T")[0];
  // })();

  const [startDate, setStartDate] = useState(YESTERDAY);
  const [endDate, setEndDate] = useState(TODAY);

  const [selectedDate] = useState<string>(TODAY);

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

  useEffect(() => {
    if (!mounted || !user) return;

    function resetTimer() {
      saveSession(user!);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, TIMEOUT_MS);
      // console.log("Session timer reset", TIMEOUT_MS / 1000, "seconds");
    }

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mounted, user, logout]);

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

  const complianceCount = report?.complianceAlerts || 0;

  useEffect(() => {
    if (mounted) {
      if (!user) router.push("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mounted]);

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

  // Loader
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-72">
          <div className="text-center mb-10">
            <p className="text-sm text-muted-foreground">Please log in...</p>
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
        <ReportsView
          selectedDate={selectedDate}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          report={report}
          setReport={setReport}
        />
      </main>
    </div>
  );
}
