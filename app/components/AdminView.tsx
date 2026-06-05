"use client";

import { useState } from "react";
import { UserPlus, Lock, Unlock, CheckCircle, X } from "lucide-react";
import type { Cashier, Role } from "../lib/types";
import { Modal } from "./Modal";

export function AdminView({
  cashiers,
  setCashiers,
  user,
}: {
  cashiers: Cashier[];
  setCashiers: React.Dispatch<React.SetStateAction<Cashier[]>>;
  user: Cashier;
}) {
  const [addModal, setAddModal] = useState(false);
  const [draft, setDraft] = useState({ name: "", role: "cashier" as Role, pin: "" });
  const [pinError, setPinError] = useState("");
  const [resetInfo, setResetInfo] = useState<{ name: string; pin: string } | null>(null);

  function toggleActive(id: string) {
    setCashiers((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  }

  function resetPin(c: Cashier) {
    const newPin = String(Math.floor(1000 + Math.random() * 9000));
    setCashiers((prev) => prev.map((x) => (x.id === c.id ? { ...x, pin: newPin } : x)));
    setResetInfo({ name: c.name, pin: newPin });
  }

  function submit() {
    if (!draft.name.trim()) return;
    if (!/^\d{4}$/.test(draft.pin)) {
      setPinError("PIN must be exactly 4 digits.");
      return;
    }
    setCashiers((prev) => [
      ...prev,
      {
        id: `c${Date.now()}`,
        name: draft.name.trim(),
        pin: draft.pin,
        role: draft.role,
        active: true,
      },
    ]);
    setDraft({ name: "", role: "cashier", pin: "" });
    setAddModal(false);
    setPinError("");
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
          Cashier Accounts \u2014 {cashiers.length} registered
        </p>
        {user.role === "manager" && (
          <button
            onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-4 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors"
          >
            <UserPlus size={13} />
            Add Cashier
          </button>
        )}
      </div>

      <div className="bg-card border border-border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Name</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Role</th>
              <th className="text-center px-4 py-2.5 text-xs text-muted-foreground font-medium">Status</th>
              {user.role === "manager" && (
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {cashiers.map((c, i) => (
              <tr
                key={c.id}
                className={`border-b border-border last:border-0 ${
                  i % 2 === 1 ? "bg-secondary/20" : ""
                }`}
              >
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground capitalize font-mono">
                  {c.role}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-sm font-mono border ${
                      c.active
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-secondary text-muted-foreground border-border"
                    }`}
                  >
                    {c.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </td>
                {user.role === "manager" && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleActive(c.id)}
                        className="px-2 py-1 text-xs bg-secondary border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                      >
                        {c.active ? <Lock size={10} /> : <Unlock size={10} />}
                        {c.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => resetPin(c)}
                        className="px-2 py-1 text-xs bg-secondary border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Reset PIN
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add cashier modal */}
      {addModal && (
        <Modal onClose={() => setAddModal(false)}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold">Add Cashier Account</h3>
            <button
              onClick={() => setAddModal(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={15} />
            </button>
          </div>
          <div className="space-y-4 mb-5">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Full Name
              </label>
              <input
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder="First Last"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Role
              </label>
              <select
                value={draft.role}
                onChange={(e) => setDraft((p) => ({ ...p, role: e.target.value as Role }))}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              >
                <option value="cashier">Cashier</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                PIN (4 digits)
              </label>
              <input
                value={draft.pin}
                onChange={(e) => {
                  setDraft((p) => ({
                    ...p,
                    pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                  }));
                  setPinError("");
                }}
                placeholder="_ _ _ _"
                maxLength={4}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
              {pinError && <p className="text-xs text-destructive mt-1.5">{pinError}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={submit}
              className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors"
            >
              Create Account
            </button>
            <button
              onClick={() => setAddModal(false)}
              className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* PIN reset info modal */}
      {resetInfo && (
        <Modal onClose={() => setResetInfo(null)}>
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold">PIN Reset Successful</h3>
              <p className="text-xs text-muted-foreground mt-1">
                New PIN for <strong>{resetInfo.name}</strong>. Communicate this securely.
              </p>
            </div>
          </div>
          <div className="bg-secondary border border-border rounded p-4 text-center mb-5">
            <p className="text-3xl font-mono font-semibold text-foreground tracking-[0.5em]">
              {resetInfo.pin}
            </p>
          </div>
          <button
            onClick={() => setResetInfo(null)}
            className="w-full h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors"
          >
            Done
          </button>
        </Modal>
      )}
    </div>
  );
}
