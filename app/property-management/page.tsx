"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart2,
  Building2,
  Check,
  LayoutDashboard,
  Loader2,
  Menu,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Settings,
  UsersRound,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import type { View } from "../components/MainApp";
import { getAllProperties, type Property } from "../lib/api";
import type { Cashier } from "../lib/types";
import {
  applyPropertyTheme,
  getPropertyTheme,
  getDefaultPropertyTheme,
  getPropertyThemeOverrides,
  getSelectedProperty,
  savePropertyThemeOverride,
  saveSelectedProperty,
  type PropertyTheme,
} from "../lib/propertyTheme";

const SESSION_KEY = "casino_session";

function loadUser(): Cashier | null {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.cashier ?? null;
  } catch {
    return null;
  }
}

function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export default function PropertyManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<Cashier | null>(null);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PropertyTheme>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  const canManage = user?.role === "manager";

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getAllProperties();
      const overrides = getPropertyThemeOverrides();
      setProperties(result);
      setDrafts(
        Object.fromEntries(
          result.map((property) => [
            property.id,
            overrides[property.id] ?? getPropertyTheme(property),
          ])
        )
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load properties.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const sessionUser = loadUser();
      setUser(sessionUser);
      setMounted(true);
      if (!sessionUser) router.replace("/login");
    });
  }, [router]);

  useEffect(() => {
    if (!mounted || !canManage) return;
    queueMicrotask(() => void loadProperties());
  }, [canManage, loadProperties, mounted]);

  const navItems = useMemo(
    () => [
      { id: "dashboard" as View, icon: LayoutDashboard, label: "Dashboard" },
      { id: "entry" as View, icon: Plus, label: "Daily Entry" },
      { id: "players" as View, icon: UsersRound, label: "Registered Players" },
      { id: "reports" as View, icon: BarChart2, label: "Reports" },
      { id: "admin" as View, icon: Settings, label: "Administration" },
      { id: "properties" as View, icon: Building2, label: "Properties" },
    ],
    []
  );

  function handleNav(item: { id: View; icon: React.ElementType; label: string }) {
    const routes: Partial<Record<View, string>> = {
      dashboard: "/",
      entry: "/daily-entry",
      players: "/registered-players",
      reports: "/reports",
      admin: "/administration",
      properties: "/property-management",
    };
    setSidebarOpen(false);
    router.push(routes[item.id] || "/");
  }

  function updateDraft(propertyId: string, key: keyof PropertyTheme, value: string) {
    setDrafts((current) => ({
      ...current,
      [propertyId]: { ...current[propertyId], [key]: value },
    }));
    setSavedId(null);
  }

  function saveColors(property: Property) {
    const theme = drafts[property.id];
    if (!theme || !isHexColor(theme.primary) || !isHexColor(theme.secondary)) return;

    savePropertyThemeOverride(property.id, theme);
    const selected = getSelectedProperty();
    if (selected?.id === property.id) {
      const updated = {
        ...selected,
        name: property.name,
        primaryColor: theme.primary,
        secondaryColor: theme.secondary,
      };
      saveSelectedProperty(updated);
      applyPropertyTheme(updated);
    }
    setSavedId(property.id);
    window.setTimeout(() => setSavedId((id) => (id === property.id ? null : id)), 2200);
  }

  function resetColors(property: Property) {
    const fallback = getDefaultPropertyTheme({
      ...property,
      primaryColor: property.primaryColor,
      secondaryColor: property.secondaryColor,
    });
    updateDraft(property.id, "primary", fallback.primary);
    updateDraft(property.id, "secondary", fallback.secondary);
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    router.replace("/login");
  }

  if (!mounted || !user) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!canManage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div>
          <Building2 className="mx-auto mb-3 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Access restricted</h1>
          <p className="mt-1 text-sm text-muted-foreground">Only supervisors and managers can manage properties.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        sidebarOpen={sidebarOpen}
        handleNav={handleNav}
        activeView="properties"
        navItems={navItems}
        complianceCount={0}
        user={user}
        logout={logout}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/50 px-4 sm:px-6">
          <button
            className="text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={19} />
          </button>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Property Management</h1>
            <p className="text-[11px] text-muted-foreground">Brand colors and property details</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
                  <Palette size={12} /> Appearance settings
                </div>
                <h1 className="text-lg font-semibold">Property Management</h1>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Assign a primary accent and secondary surface color to make each property immediately recognizable.
                </p>
              </div>
              <button
                onClick={() => void loadProperties()}
                disabled={loading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-border bg-secondary px-3 text-xs text-foreground transition-colors hover:border-accent/40 disabled:opacity-50"
              >
                <RotateCcw size={13} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex min-h-64 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 animate-spin text-accent" size={18} /> Loading properties...
              </div>
            ) : properties.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No properties are available.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {properties.map((property) => {
                  const theme = drafts[property.id] ?? getPropertyTheme(property);
                  const valid = isHexColor(theme.primary) && isHexColor(theme.secondary);

                  return (
                    <article key={property.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                      <div
                        className="h-2"
                        style={{ background: `linear-gradient(90deg, ${theme.primary} 0 58%, ${theme.secondary} 58%)` }}
                      />
                      <div className="p-4 sm:p-5">
                        <div className="mb-5 flex items-start gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10"
                            style={{ backgroundColor: theme.secondary, color: theme.primary }}
                          >
                            <Building2 size={18} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold">{property.name}</h3>
                            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{property.id}</p>
                          </div>
                        </div>

                        {(["primary", "secondary"] as const).map((key) => (
                          <label key={key} className="mb-3 block">
                            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              {key} color
                            </span>
                            <span className="flex h-10 items-center gap-2 rounded-sm border border-border bg-background px-2 focus-within:border-accent">
                              <input
                                type="color"
                                value={isHexColor(theme[key]) ? theme[key] : "#000000"}
                                onChange={(event) => updateDraft(property.id, key, event.target.value)}
                                className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                                aria-label={`${property.name} ${key} color`}
                              />
                              <input
                                value={theme[key]}
                                onChange={(event) => updateDraft(property.id, key, event.target.value)}
                                maxLength={7}
                                className="min-w-0 flex-1 bg-transparent font-mono text-xs uppercase outline-none"
                              />
                            </span>
                          </label>
                        ))}

                        <div className="mt-5 flex gap-2">
                          <button
                            onClick={() => resetColors(property)}
                            className="flex h-9 items-center justify-center rounded-sm border border-border px-3 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="Reset draft colors"
                          >
                            <RotateCcw size={13} />
                          </button>
                          <button
                            onClick={() => saveColors(property)}
                            disabled={!valid}
                            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-sm bg-accent px-3 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {savedId === property.id ? <Check size={14} /> : <Save size={14} />}
                            {savedId === property.id ? "Colors saved" : "Save colors"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Colors are temporarily saved in this browser. When the property API supports these fields, the same values can be sent as <span className="font-mono text-foreground">primaryColor</span> and <span className="font-mono text-foreground">secondaryColor</span>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
