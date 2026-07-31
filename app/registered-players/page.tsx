"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart2,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  Shield,
  UsersRound,
  X,
} from "lucide-react";
import type { Cashier } from "../lib/types";
import RegisteredPlayersView from "../components/RegisteredPlayersView";

const SESSION_KEY = "casino_session";
const TIMEOUT_MS = 60 * 60 * 1000;

type NavigationView =
  | "dashboard"
  | "entry"
  | "registered-players"
  | "reports"
  | "admin";

interface NavigationItem {
  id: NavigationView;
  icon: React.ElementType;
  label: string;
  href: string;
}

function saveSession(cashier: Cashier) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ cashier, lastActivity: Date.now() })
  );
}

function loadSession(): Cashier | null {
  try {
    const rawSession = sessionStorage.getItem(SESSION_KEY);
    if (!rawSession) return null;

    const parsed = JSON.parse(rawSession) as {
      cashier?: Cashier;
      lastActivity?: number;
    };

    if (
      !parsed.cashier ||
      !parsed.lastActivity ||
      Date.now() - parsed.lastActivity > TIMEOUT_MS
    ) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    return parsed.cashier;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export default function RegisteredPlayersPage() {
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<Cashier | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setUser(loadSession());
    setMounted(true);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (!mounted) return;
    if (!user) router.replace("/login");
  }, [mounted, router, user]);

  useEffect(() => {
    if (!mounted || !user) return;

    function resetTimer() {
      saveSession(user as Cashier);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, TIMEOUT_MS);
    }

    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, resetTimer)
    );

    resetTimer();

    return () => {
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, resetTimer)
      );

      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [logout, mounted, user]);

  const canAdmin = user?.role === "supervisor" || user?.role === "manager";
  const canReports = user?.role === "supervisor" || user?.role === "manager";

  const navigationItems = useMemo<NavigationItem[]>(
    () => [
      {
        id: "dashboard",
        icon: LayoutDashboard,
        label: "Dashboard",
        href: "/",
      },
      {
        id: "entry",
        icon: Plus,
        label: "Daily Entry",
        href: "/daily-entry",
      },
      {
        id: "registered-players",
        icon: UsersRound,
        label: "Registered Players",
        href: "/registered-players",
      },
      ...(canReports
        ? [
            {
              id: "reports" as const,
              icon: BarChart2,
              label: "Reports",
              href: "/reports",
            },
          ]
        : []),
      ...(canAdmin
        ? [
            {
              id: "admin" as const,
              icon: Settings,
              label: "Administration",
              href: "/administration",
            },
          ]
        : []),
    ],
    [canAdmin, canReports]
  );

  function navigateTo(href: string) {
    setSidebarOpen(false);
    router.push(href);
  }

  if (!mounted || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">
          {!mounted ? "Loading..." : "Redirecting to login..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-52 shrink-0 flex-col border-r border-border bg-[#0a0e18] transition-transform duration-200 lg:sticky lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between border-b border-border px-4 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield size={14} className="shrink-0 text-accent" />
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Casino del Mar
              </span>
            </div>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              Player Tracking
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-auto p-2.5">
          {navigationItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.href)}
                className={`flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors ${
                  active
                    ? "bg-accent/15 font-medium text-accent"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border p-2.5">
          <div className="mb-1 px-2.5 py-2">
            <p className="text-xs font-semibold text-foreground">{user.name}</p>
            <p className="font-mono text-xs capitalize text-muted-foreground">
              {user.role}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-card px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-secondary text-foreground"
            aria-label="Open sidebar"
          >
            <Menu size={17} />
          </button>

          <div className="ml-3">
            <p className="text-sm font-semibold text-foreground">
              Registered Players
            </p>
            <p className="text-[11px] text-muted-foreground">
              Casino del Mar
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <RegisteredPlayersView />
        </div>
      </main>
    </div>
  );
}
