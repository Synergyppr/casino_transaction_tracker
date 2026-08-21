"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Clock3, LogOut, Shield } from "lucide-react";
import { View } from "./MainApp";

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const WARNING_SECONDS = 10;
const ACTIVITY_THROTTLE_MS = 5_000;

const Sidebar = ({
  sidebarOpen,
  handleNav,
  activeView,
  navItems,
  complianceCount,
  user,
  logout,
}: {
  sidebarOpen: boolean;
  handleNav: (item: {
    id: View;
    icon: React.ElementType;
    label: string;
  }) => void;
  activeView: string;
  navItems: {
    id: string;
    icon: React.ElementType;
    label: string;
  }[];
  complianceCount: number;
  user: {
    name: string;
    role: string;
  };
  logout: () => void | Promise<void>;
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const inactivityDeadlineRef = useRef<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const lastActivityRef = useRef<number | null>(null);

  const hasLoggedOutRef = useRef(false);

  /* ---------------------------------------------------------
     FORMAT REMAINING TIME
  --------------------------------------------------------- */

  // For testing purposes
  // const formatRemainingTime = (totalSeconds: number) => {
  //   const safeSeconds = Math.max(0, totalSeconds);

  //   const minutes = Math.floor(safeSeconds / 60);
  //   const seconds = safeSeconds % 60;

  //   return {
  //     minutes,
  //     seconds,
  //     formatted: `${minutes}m ${String(seconds).padStart(2, "0")}s`,
  //   };
  // };

  /* ---------------------------------------------------------
     SAFE LOGOUT
  --------------------------------------------------------- */

  const handleAutomaticLogout = useCallback(async () => {
    if (hasLoggedOutRef.current) return;

    hasLoggedOutRef.current = true;

    // console.log(
    //   "%c[Inactivity Timer] Session expired. Logging out...",
    //   "color: #f59e0b; font-weight: bold;"
    // );

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setSecondsRemaining(0);

    try {
      await Promise.resolve(logout());
    } catch (error) {
      console.error("[Inactivity Timer] Failed to log user out:", error);

      /*
       * Allow another logout attempt if the logout request itself fails.
       */
      hasLoggedOutRef.current = false;
    }
  }, [logout]);

  /* ---------------------------------------------------------
     CHECK INACTIVITY
  --------------------------------------------------------- */

  const checkInactivity = useCallback(() => {
    const now = Date.now();

    const millisecondsRemaining =
      inactivityDeadlineRef.current !== null
        ? inactivityDeadlineRef.current - now
        : 0;

    const totalSecondsRemaining = Math.max(
      0,
      Math.ceil(millisecondsRemaining / 1000)
    );

    // const { minutes, seconds, formatted } = formatRemainingTime(
    //   totalSecondsRemaining
    // );
    // console.log(`[Inactivity Timer] ${formatted} remaining`, {
    //   minutes,
    //   seconds,
    //   totalSeconds: totalSecondsRemaining,
    // });

    /*
     * Only display the visual countdown
     * during the final 10 seconds.
     */
    if (totalSecondsRemaining <= WARNING_SECONDS && totalSecondsRemaining > 0) {
      setSecondsRemaining(totalSecondsRemaining);
    } else {
      setSecondsRemaining(null);
    }

    /*
     * Session expired.
     */
    if (millisecondsRemaining <= 0) {
      void handleAutomaticLogout();
    }
  }, [handleAutomaticLogout]);

  /* ---------------------------------------------------------
     RESET INACTIVITY
  --------------------------------------------------------- */

  const resetInactivityTimer = useCallback(() => {
    const now = Date.now();

    inactivityDeadlineRef.current = now + INACTIVITY_TIMEOUT_MS;

    if (inactivityDeadlineRef.current === null) {
      inactivityDeadlineRef.current = now + INACTIVITY_TIMEOUT_MS;
    }

    hasLoggedOutRef.current = false;

    /*
     * Hide warning immediately if the user becomes active
     * during the final 10 seconds.
     */
    setSecondsRemaining(null);

    // const totalSeconds = Math.floor(INACTIVITY_TIMEOUT_MS / 1000);
    // const { formatted } = formatRemainingTime(totalSeconds);
    // console.log(
    //   `%c[Inactivity Timer] Activity detected. Timer reset to ${formatted}.`,
    //   "color: #10b981;"
    // );
  }, []);

  /* ---------------------------------------------------------
     REGISTER USER ACTIVITY
  --------------------------------------------------------- */

  const registerActivity = useCallback(() => {
    const now = Date.now();

    /*
     * Mousemove can fire many times every second.
     *
     * Throttle activity resets so we don't continuously
     * update the deadline hundreds of times per second.
     */
    if (
      lastActivityRef.current !== null &&
      now - lastActivityRef.current < ACTIVITY_THROTTLE_MS
    ) {
      return;
    }

    resetInactivityTimer();
  }, [resetInactivityTimer]);

  /* ---------------------------------------------------------
     START TIMER + ACTIVITY LISTENERS
  --------------------------------------------------------- */

  useEffect(() => {
    /*
     * Initialize refs directly.
     *
     * Do NOT call resetInactivityTimer() or checkInactivity()
     * synchronously here because both may update React state.
     */
    const now = Date.now();

    inactivityDeadlineRef.current = now + INACTIVITY_TIMEOUT_MS;

    if (lastActivityRef.current === null) {
      lastActivityRef.current = now;
    }

    hasLoggedOutRef.current = false;

    // console.log(
    //   `[Inactivity Timer] Started: ${INACTIVITY_TIMEOUT_MS / 1000 / 60} minutes`
    // );

    /*
     * State updates happen from this timer callback,
     * not synchronously inside the effect body.
     */
    intervalRef.current = setInterval(() => {
      checkInactivity();
    }, 1000);

    const activityEvents: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "pointerdown",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, registerActivity, {
        passive: true,
      });
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, registerActivity);
      });
    };
  }, [checkInactivity, registerActivity]);

  /* ---------------------------------------------------------
     WARNING STATE
  --------------------------------------------------------- */

  const isShowingWarning =
    secondsRemaining !== null &&
    secondsRemaining > 0 &&
    secondsRemaining <= WARNING_SECONDS;

  return (
    <>
      <aside
        className={`fixed lg:sticky lg:top-0 z-50 top-0 left-0 h-screen lg:h-screen w-52 bg-[#0a0e18] border-r border-border flex flex-col shrink-0 transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* HEADER */}

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

        {/* NAVIGATION */}

        <nav className="flex-1 p-2.5 space-y-0.5 overflow-auto">
          {navItems?.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item as never)}
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

        {/* USER */}

        <div className="p-2.5 border-t border-border">
          <div className="px-2.5 py-2 mb-1">
            <p className="text-xs font-semibold text-foreground">{user.name}</p>

            <p className="text-xs text-muted-foreground capitalize font-mono">
              {user.role}
            </p>
          </div>

          <button
            onClick={() => {
              hasLoggedOutRef.current = true;

              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }

              void Promise.resolve(logout()).catch((error) => {
                console.error("[Logout] Failed to sign out:", error);

                hasLoggedOutRef.current = false;
              });
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ---------------------------------------------------------
          INACTIVITY WARNING
      --------------------------------------------------------- */}

      {isShowingWarning && (
        <div className="fixed inset-x-0 bottom-5 z-100 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border border-amber-400/20 bg-[#0a0e18]/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="flex items-center gap-4 px-4 py-4">
              {/* TIMER ICON */}

              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
                <Clock3 size={20} className="text-amber-400" />

                <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border border-[#0a0e18] bg-amber-400 px-1 text-[10px] font-bold text-black">
                  {secondsRemaining}
                </span>
              </div>

              {/* MESSAGE */}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle
                    size={13}
                    className="shrink-0 text-amber-400"
                  />

                  <p className="text-sm font-semibold text-white">
                    Session ending soon
                  </p>
                </div>

                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  You&apos;ll be signed out after{" "}
                  <span className="font-semibold text-amber-300">
                    {secondsRemaining}{" "}
                    {secondsRemaining === 1 ? "second" : "seconds"}
                  </span>{" "}
                  of inactivity.
                </p>

                <p className="mt-1 text-[10px] text-white/35">
                  Move your mouse or press any key to stay signed in.
                </p>
              </div>
            </div>

            {/* PROGRESS */}

            <div className="h-1 w-full bg-white/5">
              <div
                className="h-full bg-amber-400 transition-[width] duration-1000 ease-linear"
                style={{
                  width: `${
                    ((secondsRemaining ?? 0) / WARNING_SECONDS) * 100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
