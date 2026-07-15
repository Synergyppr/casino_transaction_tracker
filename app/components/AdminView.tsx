"use client";
import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Lock,
  Pencil,
  Unlock,
  UserPlus,
  X,
} from "lucide-react";
import type { Cashier } from "../lib/types";
import { Modal } from "./Modal";
import {
  EMPTY_CASHIER_DRAFT,
  buildEditDraft,
  createCashierFromDraft,
  toggleCashierActiveApi,
  updateCashierFromDraft,
  validateCreateCashierDraft,
  validateEditCashierDraft,
  type AddCashierDraft,
  type EditCashierDraft,
} from "../helpers/admin";

export function AdminView({
  cashiers,
  setCashiers,
  user,
  onDataChange,
}: {
  cashiers: Cashier[];
  setCashiers: React.Dispatch<React.SetStateAction<Cashier[]>>;
  user: Cashier;
  onDataChange: () => Promise<void>;
}) {
  const [addModal, setAddModal] = useState(false);
  const [draft, setDraft] = useState<AddCashierDraft>(EMPTY_CASHIER_DRAFT);
  const [formError, setFormError] = useState("");
  const [editModal, setEditModal] = useState<EditCashierDraft | null>(null);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const [successMessage, setSuccessMessage] = useState("");

  const filtered = cashiers.filter((c) =>
    tab === "active" ? c.active : !c.active
  );

  function showSuccess(message: string) {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(""), 2500);
  }

  async function toggleActive(c: Cashier) {
    setSaving(true);

    try {
      await toggleCashierActiveApi(c, user.name);

      setCashiers((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x))
      );

      await onDataChange();

      showSuccess(
        `Cashier ${c.active ? "deactivated" : "activated"} successfully.`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update cashier");
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(c: Cashier) {
    setEditModal(buildEditDraft(c));
    setEditError("");
  }

  async function submitEdit() {
    if (!editModal) return;

    const validationError = validateEditCashierDraft(editModal);

    if (validationError) {
      setEditError(validationError);
      return;
    }

    setSaving(true);

    try {
      await updateCashierFromDraft(editModal, user.name);

      setCashiers((prev) =>
        prev.map((c) =>
          c.id === editModal.id
            ? {
                ...c,
                name: [editModal.firstName, editModal.lastName]
                  .filter(Boolean)
                  .join(" "),
                role: editModal.role,
                employeeCode: editModal.employeeCode || undefined,
                phone: editModal.phone || undefined,
                active: editModal.active,
              }
            : c
        )
      );

      setEditModal(null);
      setEditError("");

      await onDataChange();

      showSuccess("Cashier profile updated successfully.");
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update cashier"
      );
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    const validationError = validateCreateCashierDraft(draft);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);

    try {
      const created = await createCashierFromDraft(draft);

      setCashiers((prev) => [...prev, created]);
      setDraft(EMPTY_CASHIER_DRAFT);
      setAddModal(false);
      setFormError("");

      await onDataChange();

      showSuccess("Cashier account created successfully.");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create cashier"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 space-y-5">
      {successMessage && (
        <div className="flex items-center gap-2 rounded-sm border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400">
          <CheckCircle2 size={15} />
          {successMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
          Cashier Accounts &mdash; {cashiers.length} registered
        </p>

        {user.role === "manager" && (
          <button
            onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-4 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors cursor-pointer"
          >
            <UserPlus size={13} />
            Add Cashier
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["active", "inactive"] as const).map((t) => {
          const count = cashiers.filter((c) =>
            t === "active" ? c.active : !c.active
          ).length;

          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 -mb-px cursor-pointer ${
                tab === t
                  ? t === "active"
                    ? "text-emerald-400 border-emerald-400"
                    : "text-rose-400 border-rose-400"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {t} ({count})
            </button>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Name
              </th>
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Role
              </th>
              <th className="text-center px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Status
              </th>

              {user.role === "manager" && (
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={user.role === "manager" ? 4 : 3}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No {tab} cashiers
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
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
                          onClick={() => toggleActive(c)}
                          disabled={saving}
                          className="px-2 py-1 text-xs bg-secondary border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors 
                          flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {c.active ? <Lock size={10} /> : <Unlock size={10} />}
                          {c.active ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          onClick={() => openEditModal(c)}
                          disabled={saving}
                          className="px-2 py-1 text-xs bg-secondary border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors 
                          flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <Pencil size={10} />
                          Update Profile
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {addModal && (
        <Modal onClose={() => setAddModal(false)}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold">Add Cashier Account</h3>

            <button
              onClick={() => setAddModal(false)}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-4 mb-5">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                First Name
              </label>
              <input
                value={draft.firstName}
                onChange={(e) => {
                  setDraft((p) => ({ ...p, firstName: e.target.value }));
                  setFormError("");
                }}
                placeholder="First name"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Last Name
              </label>
              <input
                value={draft.lastName}
                onChange={(e) => {
                  setDraft((p) => ({ ...p, lastName: e.target.value }));
                  setFormError("");
                }}
                placeholder="Last name"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Role
              </label>
              <select
                value={draft.role}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    role: e.target.value as AddCashierDraft["role"],
                  }))
                }
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
                  setFormError("");
                }}
                placeholder="_ _ _ _"
                maxLength={4}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Employee Code (optional)
              </label>
              <input
                value={draft.employeeCode}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, employeeCode: e.target.value }))
                }
                placeholder="EMP-001"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Phone (optional)
              </label>
              <input
                value={draft.phone}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="(555) 123-4567"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            {formError && (
              <p className="text-xs text-destructive">{formError}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={saving}
              className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors disabled:opacity-50 flex 
              items-center justify-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Create Account
            </button>

            <button
              onClick={() => setAddModal(false)}
              className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {editModal && (
        <Modal onClose={() => setEditModal(null)}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold">Update Profile</h3>

            <button
              onClick={() => setEditModal(null)}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-4 mb-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                  First Name
                </label>
                <input
                  value={editModal.firstName}
                  disabled
                  className="w-full h-9 px-3 bg-secondary/50 border border-border rounded-sm text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                  Last Name
                </label>
                <input
                  value={editModal.lastName}
                  disabled
                  className="w-full h-9 px-3 bg-secondary/50 border border-border rounded-sm text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Role
              </label>
              <select
                value={editModal.role}
                onChange={(e) =>
                  setEditModal((p) =>
                    p
                      ? {
                          ...p,
                          role: e.target.value as EditCashierDraft["role"],
                        }
                      : p
                  )
                }
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              >
                <option value="cashier">Cashier</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                New PIN (leave empty to keep current)
              </label>
              <input
                value={editModal.pin}
                onChange={(e) => {
                  setEditModal((p) =>
                    p
                      ? {
                          ...p,
                          pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                        }
                      : p
                  );
                  setEditError("");
                }}
                placeholder="_ _ _ _"
                maxLength={4}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Employee Code
              </label>
              <input
                value={editModal.employeeCode}
                onChange={(e) =>
                  setEditModal((p) =>
                    p ? { ...p, employeeCode: e.target.value } : p
                  )
                }
                placeholder="EMP-001"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Phone
              </label>
              <input
                value={editModal.phone}
                onChange={(e) =>
                  setEditModal((p) => (p ? { ...p, phone: e.target.value } : p))
                }
                placeholder="(555) 123-4567"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Status
              </label>
              <div className="flex gap-2">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    onClick={() =>
                      setEditModal((p) => (p ? { ...p, active: val } : p))
                    }
                    className={`flex-1 h-9 rounded-sm text-sm transition-colors border cursor-pointer ${
                      editModal.active === val
                        ? val
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {val ? "Active" : "Inactive"}
                  </button>
                ))}
              </div>
            </div>

            {editError && (
              <p className="text-xs text-destructive">{editError}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={submitEdit}
              disabled={saving}
              className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors disabled:opacity-50 flex
              items-center justify-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Save Changes
            </button>

            <button
              onClick={() => setEditModal(null)}
              className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
