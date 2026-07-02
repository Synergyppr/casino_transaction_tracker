"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Loader2, X } from "lucide-react";
import type { Player, AlertStatus } from "../lib/types";
import { WARNING_THRESHOLD, COMPLIANCE_THRESHOLD } from "../lib/constants";
import { getPlayerTotals, getStatus, fmt } from "../lib/utils";
import { StatusBadge } from "./StatusBadge";
import { AmtCell } from "./AmtCell";
import { Modal } from "./Modal";
import { createPlayerApi } from "../lib/api";

type PlayerDraft = {
  gamerNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
};

const EMPTY_PLAYER_DRAFT: PlayerDraft = {
  gamerNumber: "",
  firstName: "",
  lastName: "",
  phone: "",
};

export function MonitoringView({
  players,
  setPlayers,
  createdBy,
  onDataChange,
}: {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  createdBy: string;
  onDataChange?: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<AlertStatus | "all">("all");
  const [addModal, setAddModal] = useState(false);
  const [draft, setDraft] = useState<PlayerDraft>(EMPTY_PLAYER_DRAFT);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const normalizedPlayers = useMemo(
    () =>
      players.map((p) => ({
        ...p,
        transactions: (p.transactions || []).map((t) => ({
          ...t,
          direction:
            t.direction === "outgoing"
              ? ("outgoing" as const)
              : ("incoming" as const),
          category: t.category || "Other",
          amount: Number(t.amount) || 0,
          timestamp: t.timestamp || "",
          cashierId: t.cashierId || "",
        })),
      })),
    [players]
  );

  const counts = useMemo(
    () => ({
      all: normalizedPlayers.length,
      compliance: normalizedPlayers.filter((p) => {
        const { incoming, outgoing } = getPlayerTotals(p);
        return getStatus(incoming, outgoing) === "compliance";
      }).length,
      warning: normalizedPlayers.filter((p) => {
        const { incoming, outgoing } = getPlayerTotals(p);
        return getStatus(incoming, outgoing) === "warning";
      }).length,
      normal: normalizedPlayers.filter((p) => {
        const { incoming, outgoing } = getPlayerTotals(p);
        return getStatus(incoming, outgoing) === "normal";
      }).length,
    }),
    [normalizedPlayers]
  );

  const displayed = normalizedPlayers.filter((p) => {
    if (filter === "all") return true;

    const { incoming, outgoing } = getPlayerTotals(p);
    return getStatus(incoming, outgoing) === filter;
  });

  const tabs = [
    { key: "all", label: "All", cls: "text-foreground" },
    { key: "compliance", label: "Compliance", cls: "text-emerald-400" },
    { key: "warning", label: "Warning", cls: "text-amber-400" },
    { key: "normal", label: "Normal", cls: "text-muted-foreground" },
  ] as const;

  function showSuccess(message: string) {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(""), 2500);
  }

  async function submitPlayer() {
    if (!draft.gamerNumber.trim()) {
      setFormError("Gamer number is required.");
      return;
    }

    if (!draft.firstName.trim()) {
      setFormError("First name is required.");
      return;
    }

    if (!draft.lastName.trim()) {
      setFormError("Last name is required.");
      return;
    }

    setSaving(true);

    try {
      const created = await createPlayerApi({
        gamerNumber: draft.gamerNumber.trim(),
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        phone: draft.phone.trim(),
        createdBy,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPlayers((prev: any[]) => [...prev, created]);
      setDraft(EMPTY_PLAYER_DRAFT);
      setFormError("");
      setAddModal(false);

      await onDataChange?.();

      showSuccess("Player created successfully.");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create player"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 space-y-5">
      {successMessage && (
        <div className="flex items-center gap-2 rounded-sm border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400">
          <CheckCircle size={15} />
          {successMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors border flex items-center gap-1.5 cursor-pointer ${
                filter === t.key
                  ? t.key === "compliance"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : t.key === "warning"
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-accent/15 text-accent border-accent/30"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="font-mono">{counts[t.key]}</span>
            </button>
          ))}
        </div>

        {/* <button
          onClick={() => setAddModal(true)}
          className="flex items-center gap-2 px-4 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors cursor-pointer"
        >
          <UserPlus size={13} />
          Add Player
        </button> */}
      </div>

      <div className="bg-card border border-border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Player
              </th>
              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Cash In
              </th>
              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Cash Out
              </th>
              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Txns
              </th>
              <th className="text-center px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Status
              </th>
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Required Action
              </th>
            </tr>
          </thead>

          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground text-sm"
                >
                  No players in this category.
                </td>
              </tr>
            ) : (
              displayed.map((p, i) => {
                const { incoming, outgoing } = getPlayerTotals(p);
                const status = getStatus(incoming, outgoing);

                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border last:border-0 ${
                      status === "compliance"
                        ? "bg-emerald-500/5"
                        : status === "warning"
                        ? "bg-amber-500/5"
                        : i % 2 === 1
                        ? "bg-secondary/20"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold">{p.name}</td>

                    <td className="px-4 py-3 text-right">
                      <AmtCell amount={incoming} />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <AmtCell amount={outgoing} />
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      {p.transactions?.length || 0}{" "}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={status} />
                    </td>

                    <td className="px-4 py-3 text-xs">
                      {status === "compliance" && (
                        <span className="text-emerald-400">
                          File compliance documentation
                        </span>
                      )}
                      {status === "warning" && (
                        <span className="text-amber-400">
                          Prepare ID & documentation
                        </span>
                      )}
                      {status === "normal" && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-amber-950/25 border border-amber-500/20 rounded p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={12} className="text-amber-400" />
            <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
              Warning Threshold
            </span>
          </div>
          <p className="text-2xl font-mono font-semibold text-amber-400">
            {fmt(WARNING_THRESHOLD)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Per direction — cash in and cash out tracked independently
          </p>
        </div>

        <div className="bg-emerald-950/25 border border-emerald-500/20 rounded p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={12} className="text-emerald-400" />
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Compliance Threshold
            </span>
          </div>
          <p className="text-2xl font-mono font-semibold text-emerald-400">
            {fmt(COMPLIANCE_THRESHOLD)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Documentation required — player may continue gaming
          </p>
        </div>
      </div>

      {addModal && (
        <Modal onClose={() => setAddModal(false)}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold">Add Player</h3>

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
                Gamer Number
              </label>
              <input
                value={draft.gamerNumber}
                onChange={(e) => {
                  setDraft((p) => ({ ...p, gamerNumber: e.target.value }));
                  setFormError("");
                }}
                placeholder="GMR-001"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>

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
                Phone
              </label>
              <input
                value={draft.phone}
                onChange={(e) => {
                  setDraft((p) => ({ ...p, phone: e.target.value }));
                  setFormError("");
                }}
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
              onClick={submitPlayer}
              disabled={saving}
              className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Create Player
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
    </div>
  );
}
