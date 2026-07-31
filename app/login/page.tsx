"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Cashier } from "../lib/types";
import { LoginScreen } from "../components/LoginScreen";

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

// function clearSession() {
//   sessionStorage.removeItem(SESSION_KEY);
// }

const Page = () => {
  const router = useRouter();
  const [, setMounted] = useState(false);
  const [, setUser] = useState<Cashier | null>(null);

  useEffect(() => {
    async function initializeSession() {
      const session = loadSession();
      setUser(session);
      setMounted(true);
    }
    initializeSession();
  }, []);

  const handleLogin = useCallback((cashier: Cashier) => {
    saveSession(cashier);
    setUser(cashier);
    router.push("daily-entry");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <LoginScreen onLogin={handleLogin} />
    </div>
  );
};

export default Page;
