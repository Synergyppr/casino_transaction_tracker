"use client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Clock3 } from "lucide-react";
import { applyPropertyTheme, getSelectedProperty } from "../lib/propertyTheme";

const SESSION_KEY = "casino_session";
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
const WARNING_SECONDS = 30;
const ACTIVITY_THROTTLE_MS = 1_000;

export function AppSessionManager() {
  const pathname = usePathname();
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef(0);
  const lastResetRef = useRef(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (tickerRef.current) clearInterval(tickerRef.current);
    setSecondsRemaining(null);
    router.replace("/login?reason=inactivity");
  }, [router]);

  useEffect(() => {
    applyPropertyTheme(getSelectedProperty());
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/login") return;

    const rawSession = sessionStorage.getItem(SESSION_KEY);
    if (!rawSession) return;

    let cashier: unknown;
    let storedActivity = 0;
    try {
      const parsed = JSON.parse(rawSession) as { cashier?: unknown; lastActivity?: number };
      cashier = parsed.cashier;
      storedActivity = Number(parsed.lastActivity) || 0;
    } catch {
      queueMicrotask(logout);
      return;
    }

    if (!cashier || Date.now() - storedActivity >= INACTIVITY_TIMEOUT_MS) {
      queueMicrotask(logout);
      return;
    }

    const scheduleLogout = (activityAt = Date.now()) => {
      deadlineRef.current = activityAt + INACTIVITY_TIMEOUT_MS;
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ cashier, lastActivity: activityAt })
      );
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(logout, Math.max(0, deadlineRef.current - Date.now()));
      setSecondsRemaining(null);
    };

    const registerActivity = () => {
      const now = Date.now();
      if (now - lastResetRef.current < ACTIVITY_THROTTLE_MS) return;
      lastResetRef.current = now;
      scheduleLogout(now);
    };

    scheduleLogout(storedActivity);
    tickerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setSecondsRemaining(remaining <= WARNING_SECONDS ? remaining : null);
    }, 1_000);

    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
    ];
    events.forEach((event) => window.addEventListener(event, registerActivity, { passive: true }));

    const handleVisibility = () => {
      if (!document.hidden && Date.now() >= deadlineRef.current) logout();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      events.forEach((event) => window.removeEventListener(event, registerActivity));
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [logout, pathname]);

  if (secondsRemaining === null || secondsRemaining <= 0 || pathname === "/login") {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-5 z-100 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-amber-400/25 bg-[#0a0e18]/95 p-4 shadow-2xl backdrop-blur-xl">
        <Clock3 className="shrink-0 text-amber-400" size={22} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <AlertTriangle size={13} className="text-amber-400" /> Session ending soon
          </p>
          <p className="mt-1 text-xs text-white/55">
            You’ll be signed out in {secondsRemaining} seconds. Interact with the app to stay signed in.
          </p>
        </div>
      </div>
    </div>
  );
}
