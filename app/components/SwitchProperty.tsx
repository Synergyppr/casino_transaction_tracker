"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Loader2, X } from "lucide-react";
import { Modal } from "./Modal";
import { getAllProperties, type Property } from "../lib/api";
import { getSelectedProperty } from "../lib/propertyTheme";
import { switchManagerProperty } from "../lib/switchProperty";

export function SwitchProperty({ user }: { user: { id: string; role: string } }) {
  const [open, setOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (user.role.trim().toLowerCase() !== "manager") return null;
  async function loadProperties() {
    setLoading(true); setError("");
    try { setProperties(await getAllProperties()); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load properties."); }
    finally { setLoading(false); }
  }

  function openModal() {
    setPin("");
    setSelectedId("");
    setOpen(true);
    void loadProperties();
  }

  function close() {
    if (!saving) {
      setOpen(false);
      setPin("");
      setError("");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || loading) return;
    const property = properties.find(item => item.id === selectedId);
    if (!property) {
      setError("Choose a property.");
      return;
    }
    setSaving(true); setError("");
    try {
      await switchManagerProperty(user, pin, property);
      setPin("");
      // Start a fresh page with the verified session so old property data cannot carry over.
      window.location.assign("/daily-entry");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to switch satellite."); setPin(""); setSaving(false); }
  }

  return <>
    <button
      type="button"
      onClick={openModal}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-secondary">
      <Building2 size={14} />Switch Satellite
    </button>
    {open && createPortal(
      <Modal onClose={close}>
        <form onSubmit={event => void submit(event)} className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Switch Property</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a property and enter your manager PIN. Daily Entry will open for the selected property.
              </p>
            </div>
            <button type="button" onClick={close} disabled={saving} aria-label="Close property switcher" className="shrink-0 p-1">
              <X size={16} />
            </button>
          </div>
          <label className="block space-y-1 text-xs text-muted-foreground">
            <span>Property</span>
            <select aria-label="Switch to property" value={selectedId}
              onChange={event => { setSelectedId(event.target.value); setError(""); }}
              disabled={loading || saving}
              className="w-full min-w-0 rounded border border-border bg-secondary px-3 py-2 text-sm text-foreground">
              <option value="">{loading ? "Loading properties..." : "Choose a property"}
              </option>
              {properties.map(property =>
                <option key={property.id} value={property.id} disabled={property.id === getSelectedProperty()?.id}>
                  {property.name}{property.id === getSelectedProperty()?.id ? " (current)" : ""}
                </option>
              )}
            </select>
          </label>
          <label className="block space-y-1 text-xs text-muted-foreground">
            <span>Your manager PIN
            </span>
            <input
              aria-label="Manager PIN"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin}
              onChange={event => setPin(event.target.value.replace(/\D/g, ""))}
              disabled={saving}
              className="w-full rounded border border-border bg-secondary px-3 py-2 text-foreground" />
          </label>
          {error &&
            <div role="alert" className="text-xs text-destructive">{error}
              <button type="button" onClick={() => void loadProperties()} disabled={saving} className="underline">
                Reload properties
              </button>
            </div>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={close} disabled={saving} className="rounded border border-border px-3 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving || loading || !selectedId || pin.length !== 4}
              className="inline-flex items-center gap-2 rounded bg-accent px-3 py-2 text-sm text-white disabled:opacity-40">
              {saving && <Loader2 size={14} className="animate-spin" />}Switch Satellite
            </button>
          </div>
        </form>
      </Modal>,
      document.body
    )}
  </>;
}
