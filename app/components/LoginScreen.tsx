"use client";
import { useState } from "react";
import { Shield } from "lucide-react";
import type { Cashier } from "../lib/types";
import { loginCashier } from "../lib/api";

export function LoginScreen({ onLogin }: { onLogin: (c: Cashier) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleKey(k: string) {
    if (shaking || loading) return;
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    setError("");
    if (next.length === 4) {
      setLoading(true);
      try {
        const cashier = await loginCashier(next);
        setTimeout(() => onLogin(cashier), 180);
      } catch (err) {
        setTimeout(() => {
          setShaking(true);
          setError(err instanceof Error ? err.message : "Invalid PIN");
          setTimeout(() => {
            setPin("");
            setShaking(false);
            setLoading(false);
          }, 500);
        }, 200);
      }
    }
  }

  function handleClear() {
    setPin("");
    setError("");
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "\u232B"];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-72">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-11 h-11 bg-accent/10 border border-accent/20 rounded mb-4">
            <Shield size={20} className="text-accent" />
          </div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Casino del Mar</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-widest">
            Player Tracking System
          </p>
        </div>

        {/* PIN dots */}
        <div
          className="flex justify-center gap-3 mb-7 transition-all"
          style={{ animation: shaking ? "shake 0.4s ease" : "none" }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-150 ${
                i < pin.length ? "bg-accent scale-110" : "bg-secondary border border-border"
              }`}
            />
          ))}
        </div>

        {error ? (
          <p className="text-center text-xs text-destructive mb-4 font-mono">{error}</p>
        ) : (
          <div className="mb-4 h-4" />
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {keys.map((k, i) => {
            if (!k) return <div key={i} />;
            if (k === "\u232B")
              return (
                <button
                  key={i}
                  onClick={handleClear}
                  className="h-13 py-3.5 rounded-sm bg-secondary hover:bg-secondary/80 border border-border transition-colors text-muted-foreground text-base"
                >
                  {k}
                </button>
              );
            return (
              <button
                key={i}
                onClick={() => handleKey(k)}
                className="h-13 py-3.5 rounded-sm bg-secondary hover:bg-accent/15 active:bg-accent/25 border border-border transition-colors text-foreground text-lg font-mono font-medium"
              >
                {k}
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-7">
          Enter your 4-digit cashier PIN
        </p>
      </div>
    </div>
  );
}
