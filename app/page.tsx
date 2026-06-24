"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Cashier } from "./lib/types";
import { LoginScreen } from "./components/LoginScreen";
import { MainApp } from "./components/MainApp";

const SESSION_KEY = "casino_session";
const TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

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
  const [user, setUser] = useState<Cashier | null>(() => {
    if (typeof window === "undefined") return null;
    return loadSession();
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const handleLogin = useCallback((cashier: Cashier) => {
    saveSession(cashier);
    setUser(cashier);
  }, []);

  // Reset inactivity timer on user interaction
  useEffect(() => {
    if (!user) return;

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
  }, [user, logout]);

  if (!user) return <LoginScreen onLogin={handleLogin} />;
  return <MainApp user={user} onLogout={logout} />;
}

