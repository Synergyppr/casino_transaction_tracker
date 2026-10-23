"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { LogOut } from "lucide-react";
import { Modal } from "./Modal";
export function ConfirmLogout({
  onLogout
}: {
  onLogout: () => void | Promise<void>
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    if (!busy) {
      setOpen(false); setError("");
    }
  };

  async function confirm() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await onLogout(); setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      <LogOut size={14} />
      Sign Out
    </button>
    {open &&
      createPortal(
        <Modal onClose={close}>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Sign out?
            </h2>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to sign out of Casino del Mar?
            </p>
            {error &&
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            }
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="rounded border border-border px-3 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  void confirm()}
                disabled={busy}
                className="rounded bg-accent px-3 py-2 text-sm text-white disabled:opacity-50">
                {busy ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </Modal>, document.body)}
  </>;
}
