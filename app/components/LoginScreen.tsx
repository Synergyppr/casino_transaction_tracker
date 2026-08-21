"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Loader2, Shield } from "lucide-react";
import type { Cashier } from "../lib/types";
import { loginCashier } from "../lib/api";

export interface Property {
  id: string;
  name: string;
}

interface LoginScreenProps {
  onLogin: (cashier: Cashier) => void;
  properties: Property[];
  propertiesLoading?: boolean;
  propertiesError?: string;
}

const SELECTED_PROPERTY_KEY = "casino_selected_property";

export function LoginScreen({
  onLogin,
  properties,
  propertiesLoading = false,
  propertiesError = "",
}: LoginScreenProps) {
  const router = useRouter();

  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedProperty = properties.find(
    (property) => property.id === selectedPropertyId
  );

  function handlePropertyChange(propertyId: string) {
    setSelectedPropertyId(propertyId);
    setPin("");
    setError("");

    const property = properties.find((item) => item.id === propertyId);

    if (property) {
      sessionStorage.setItem(SELECTED_PROPERTY_KEY, JSON.stringify(property));
    } else {
      sessionStorage.removeItem(SELECTED_PROPERTY_KEY);
    }
  }

  async function handleKey(k: string) {
    if (shaking || loading || propertiesLoading) return;

    if (!selectedPropertyId) {
      setError("Select a property before entering your PIN.");
      return;
    }

    if (pin.length >= 4) return;

    const next = pin + k;

    setPin(next);
    setError("");

    if (next.length === 4) {
      setLoading(true);

      try {
        /**
         * Your current login endpoint only receives the PIN.
         *
         * If your backend later requires propertyId, this can become:
         *
         * const cashier = await loginCashier(
         *   next,
         *   selectedPropertyId
         * );
         */
        const cashier = await loginCashier(
          next,
          selectedProperty?.id as string
        );

        /**
         * Save selected property again immediately before login succeeds.
         * This ensures the selected property is available throughout
         * the authenticated application.
         */
        if (selectedProperty) {
          sessionStorage.setItem(
            SELECTED_PROPERTY_KEY,
            JSON.stringify(selectedProperty)
          );
        }

        setTimeout(() => {
          onLogin(cashier);
        }, 180);

        router.push("/daily-entry");
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
    if (loading) return;

    setPin("");
    setError("");
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "\u232B"];

  const pinDisabled = !selectedPropertyId || propertiesLoading || loading;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-72">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-11 h-11 bg-accent/10 border border-accent/20 rounded mb-4">
            <Shield size={20} className="text-accent" />
          </div>

          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Casino del Mar
          </h1>

          <p className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-widest">
            Player Tracking System
          </p>
        </div>

        {/* Property */}
        <div className="mb-7">
          <label
            htmlFor="property"
            className="block mb-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground"
          >
            Property
          </label>

          <div className="relative">
            <Building2
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <select
              id="property"
              value={selectedPropertyId}
              onChange={(event) => handlePropertyChange(event.target.value)}
              disabled={propertiesLoading || loading}
              className="
                h-11
                w-full
                appearance-none
                rounded-sm
                border
                border-border
                bg-secondary
                pl-9
                pr-9
                text-sm
                text-foreground
                outline-none
                transition-colors
                hover:border-accent/40
                focus:border-accent
                focus:ring-1
                focus:ring-accent/30
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <option value="">
                {propertiesLoading
                  ? "Loading properties..."
                  : "Select property"}
              </option>

              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>

            {propertiesLoading ? (
              <Loader2
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-accent"
              />
            ) : (
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            )}
          </div>

          {propertiesError && (
            <p className="mt-2 text-xs text-destructive">{propertiesError}</p>
          )}

          {!propertiesLoading &&
            !propertiesError &&
            properties.length === 0 && (
              <p className="mt-2 text-xs text-destructive">
                No properties are currently available.
              </p>
            )}

          {selectedProperty && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {selectedProperty.name}
            </div>
          )}
        </div>

        {/* PIN dots */}
        <div
          className={`flex justify-center gap-3 mb-7 transition-all ${
            pinDisabled ? "opacity-50" : ""
          }`}
          style={{
            animation: shaking ? "shake 0.4s ease" : "none",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-150 ${
                i < pin.length
                  ? "bg-accent scale-110"
                  : "bg-secondary border border-border"
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error ? (
          <p className="text-center text-xs text-destructive mb-4 font-mono">
            {error}
          </p>
        ) : (
          <div className="mb-4 h-4" />
        )}

        {/* Keypad */}
        <div
          className={`grid grid-cols-3 gap-2 transition-opacity ${
            pinDisabled ? "opacity-50" : "opacity-100"
          }`}
        >
          {keys.map((k, i) => {
            if (!k) {
              return <div key={i} />;
            }

            if (k === "\u232B") {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={handleClear}
                  disabled={pinDisabled}
                  className="
                    h-13
                    py-3.5
                    rounded-sm
                    bg-secondary
                    hover:bg-secondary/80
                    border
                    border-border
                    transition-colors
                    text-muted-foreground
                    text-base
                    disabled:cursor-not-allowed
                  "
                >
                  {k}
                </button>
              );
            }

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleKey(k)}
                disabled={pinDisabled}
                className="
                  h-13
                  py-3.5
                  rounded-sm
                  bg-secondary
                  hover:bg-accent/15
                  active:bg-accent/25
                  border
                  border-border
                  transition-colors
                  text-foreground
                  text-lg
                  font-mono
                  font-medium
                  disabled:cursor-not-allowed
                "
              >
                {k}
              </button>
            );
          })}
        </div>

        {/* Status */}
        <div className="mt-7 text-center">
          {loading ? (
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={13} className="animate-spin text-accent" />
              Authenticating...
            </div>
          ) : selectedProperty ? (
            <p className="text-xs text-muted-foreground">
              Enter your 4-digit cashier PIN
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Select a property to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
