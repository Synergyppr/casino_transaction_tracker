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
const TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

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

/* ---------------------------------------------------------
   SESSION HELPERS
--------------------------------------------------------- */

function saveSession(cashier: Cashier) {
  if (typeof window === "undefined") return;

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      cashier,
      lastActivity: Date.now(),
    })
  );
}

function loadSession(): Cashier | null {
  if (typeof window === "undefined") return null;

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
  } catch (error) {
    console.error("Failed to load session:", error);

    sessionStorage.removeItem(SESSION_KEY);

    return null;
  }
}

function clearSession() {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(SESSION_KEY);
}

/* ---------------------------------------------------------
   PAGE
--------------------------------------------------------- */

export default function RegisteredPlayersPage() {
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<Cashier | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------------------------------------------------------
     INITIAL SESSION LOAD

     The state updates happen inside queueMicrotask instead of
     synchronously inside the effect body. This resolves the
     react-hooks/set-state-in-effect warning.
  --------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      const savedUser = loadSession();

      setUser(savedUser);
      setMounted(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------
     LOGOUT
  --------------------------------------------------------- */

  const logout = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    clearSession();

    setUser(null);

    router.replace("/login");
  }, [router]);

  /* ---------------------------------------------------------
     REDIRECT WHEN SESSION DOES NOT EXIST
  --------------------------------------------------------- */

  useEffect(() => {
    if (!mounted) return;
    if (user) return;

    router.replace("/login");
  }, [mounted, router, user]);

  /* ---------------------------------------------------------
     SESSION INACTIVITY TIMER
  --------------------------------------------------------- */

  useEffect(() => {
    if (!mounted || !user) return;

    const resetTimer = () => {
      /*
       * Persist the latest activity time.
       */
      saveSession(user);

      /*
       * Clear the previous logout timeout.
       */
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      /*
       * Start a fresh inactivity timeout.
       */
      timerRef.current = setTimeout(() => {
        logout();
      }, TIMEOUT_MS);
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, {
        passive: true,
      });
    });

    /*
     * Initial timeout setup.
     *
     * This doesn't update React state, so it is safe to call
     * synchronously inside the effect.
     */
    resetTimer();

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [logout, mounted, user]);

  /* ---------------------------------------------------------
     PERMISSIONS
  --------------------------------------------------------- */

  const canAdmin = user?.role === "supervisor" || user?.role === "manager";

  const canReports = user?.role === "supervisor" || user?.role === "manager";

  /* ---------------------------------------------------------
     NAVIGATION
  --------------------------------------------------------- */

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

  const navigateTo = (href: string) => {
    setSidebarOpen(false);

    router.push(href);
  };

  /* ---------------------------------------------------------
     INITIAL LOADING / REDIRECT
  --------------------------------------------------------- */

  if (!mounted || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">
          {!mounted ? "Loading..." : "Redirecting to login..."}
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */

  return (
    <div className="flex h-screen min-h-screen overflow-hidden bg-background">
      {/* Mobile Overlay */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-52 shrink-0 flex-col border-r border-border bg-[#0a0e18] transition-transform duration-200 lg:sticky lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Branding */}

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

        {/* Navigation */}

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

        {/* User */}

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

      {/* Main */}

      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}

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

            <p className="text-[11px] text-muted-foreground">Casino del Mar</p>
          </div>
        </header>

        {/* Registered Players */}

        <div className="min-h-0 flex-1">
          <RegisteredPlayersView />
        </div>
      </main>
    </div>
  );
}
