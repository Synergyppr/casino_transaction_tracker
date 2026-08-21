"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cashier } from "../lib/types";
import { LoginScreen } from "../components/LoginScreen";
import { getAllProperties } from "../lib/api";

const SESSION_KEY = "casino_session";
const TIMEOUT_MS = 60 * 60 * 1000;

function saveSession(cashier: Cashier) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      cashier,
      lastActivity: Date.now(),
    })
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
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

const Page = () => {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [, setUser] = useState<Cashier | null>(null);

  const [properties, setProperties] = useState<any[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState("");

  /**
   * Initialize session + properties
   *
   * Follows the same request pattern used by RegisteredPlayersView.
   */
  useEffect(() => {
    const controller = new AbortController();

    async function initialize() {
      /*
       * Load existing cashier session
       */
      const session = loadSession();

      setUser(session);
      setMounted(true);

      /*
       * Load properties
       */
      setPropertiesLoading(true);
      setPropertiesError("");

      try {
        const registeredProperties = await getAllProperties(
          controller.signal
        );

        console.log("Fetched properties:", registeredProperties);

        setProperties(registeredProperties);
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        console.error("Error fetching properties:", err);

        setPropertiesError(
          err instanceof Error
            ? err.message
            : "Failed to load properties."
        );

        setProperties([]);
      } finally {
        if (!controller.signal.aborted) {
          setPropertiesLoading(false);
        }
      }
    }

    void initialize();

    return () => controller.abort();
  }, []);

  /**
   * Handle successful login
   */
  const handleLogin = useCallback(
    (cashier: Cashier) => {
      saveSession(cashier);

      setUser(cashier);

      router.push("/daily-entry");
    },
    [router]
  );

  if (!mounted) {
    return null;
  }

  return (
    <div>
      <LoginScreen
        onLogin={handleLogin}
        properties={properties}
        propertiesLoading={propertiesLoading}
        propertiesError={propertiesError}
      />
    </div>
  );
};

export default Page;