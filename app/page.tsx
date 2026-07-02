"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Cashier } from "./lib/types";
import { LoginScreen } from "./components/LoginScreen";
import { MainApp } from "./components/MainApp";

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
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<Cashier | null>(null);
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

  return <MainApp user={user} onLogout={logout} />;
}