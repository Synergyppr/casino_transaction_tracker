"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Loader2, X } from "lucide-react";
import type { Player, AlertStatus } from "../lib/types";
import { WARNING_THRESHOLD, COMPLIANCE_THRESHOLD } from "../lib/constants";
import { getPlayerTotals, getStatus, fmt } from "../lib/utils";
import { StatusBadge } from "./StatusBadge";
import { AmtCell } from "./AmtCell";
import { Modal } from "./Modal";
import { createPlayerApi, mapApiPlayer } from "../lib/api";

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
          cashierId: t.cashierId || "",
          date: t.date || "",
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
      setFormError("Player number is required.");
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

      setPlayers((prev) => [...prev, mapApiPlayer(created)]);
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
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors border flex items-center gap-1.5 cursor-pointer ${filter === t.key
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
        <table role="table" data-mobile-stack
        className="w-full lg:min-w-160 text-sm
          max-lg:block max-lg:w-full max-lg:min-w-0! max-lg:max-w-full max-lg:table-auto
          max-lg:[&>colgroup]:hidden
          max-lg:[&>thead]:absolute max-lg:[&>thead]:size-px max-lg:[&>thead]:p-0
          max-lg:[&>thead]:overflow-hidden max-lg:[&>thead]:[clip-path:inset(50%)] max-lg:[&>thead]:whitespace-nowrap
          max-lg:[&>tbody]:block max-lg:[&>tbody]:w-full max-lg:[&>tfoot]:block max-lg:[&>tfoot]:w-full
          max-lg:[&>tbody>tr]:flex max-lg:[&>tbody>tr]:flex-col max-lg:[&>tbody>tr]:w-full
          max-lg:[&>tbody>tr]:p-2 max-lg:[&>tbody>tr]:border-b max-lg:[&>tbody>tr]:border-border max-lg:[&>tbody>tr]:mb-2
          max-lg:[&>tfoot>tr]:flex max-lg:[&>tfoot>tr]:flex-col max-lg:[&>tfoot>tr]:w-full
          max-lg:[&>tfoot>tr]:p-2 max-lg:[&>tfoot>tr]:border-b max-lg:[&>tfoot>tr]:border-border
          max-lg:[&>tbody>tr>td]:grid max-lg:[&>tbody>tr>td]:grid-cols-1 max-lg:[&>tbody>tr>td]:items-start
          max-lg:[&>tbody>tr>td]:gap-1 max-lg:[&>tbody>tr>td]:w-full max-lg:[&>tbody>tr>td]:min-w-0
          max-lg:[&>tbody>tr>td]:p-2 max-lg:[&>tbody>tr>td]:text-left max-lg:[&>tbody>tr>td]:whitespace-normal max-lg:[&>tbody>tr>td]:wrap-anywhere
          max-lg:[&>tfoot>tr>td]:grid max-lg:[&>tfoot>tr>td]:grid-cols-1 max-lg:[&>tfoot>tr>td]:items-start
          max-lg:[&>tfoot>tr>td]:gap-1 max-lg:[&>tfoot>tr>td]:w-full max-lg:[&>tfoot>tr>td]:min-w-0
          max-lg:[&>tfoot>tr>td]:p-2 max-lg:[&>tfoot>tr>td]:text-left max-lg:[&>tfoot>tr>td]:whitespace-normal max-lg:[&>tfoot>tr>td]:wrap-anywhere
          max-lg:[&_td[data-label]:not([data-label=''])]:before:content-[attr(data-label)]
          max-lg:[&_td[data-label]:not([data-label=''])]:before:text-muted-foreground
          max-lg:[&_td[data-label]:not([data-label=''])]:before:text-[0.6875rem]
          max-lg:[&_td[data-label]:not([data-label=''])]:before:font-medium max-lg:[&_td[data-label]:not([data-label=''])]:before:text-left
          max-lg:[&>tbody>tr>td[colspan]]:block max-lg:[&>tfoot>tr>td[colspan]]:block
          max-lg:[&>tbody>tr[data-transactions-row]]:p-0 max-lg:[&>tbody>tr[data-transactions-row]>td]:p-0">
          <thead role="rowgroup">
            <tr role="row" className="border-b border-border bg-secondary/40">
              <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Player
              </th>
              <th role="columnheader" className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Cash In
              </th>
              <th role="columnheader" className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Cash Out
              </th>
              <th role="columnheader" className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Txns
              </th>
              <th role="columnheader" className="text-center px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Status
              </th>
              <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Required Action
              </th>
            </tr>
          </thead>

          <tbody role="rowgroup">
            {displayed.length === 0 ? (
              <tr role="row">
                <td role="cell" data-label=""
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
                  <tr role="row"
                    key={p.id}
                    className={`border-b border-border last:border-0 ${status === "compliance"
                      ? "bg-emerald-500/5"
                      : status === "warning"
                        ? "bg-amber-500/5"
                        : i % 2 === 1
                          ? "bg-secondary/20"
                          : ""
                      }`}
                  >
                    <td
                      role="cell"
                      data-label="Player"
                      className="px-4 py-3 font-semibold"
                    >
                      <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                        {p.name}
                      </div>
                    </td>
                    <td
                      role="cell"
                      data-label="Cash In"
                      className="px-4 py-3 text-right"
                    >
                      <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                        <AmtCell amount={incoming} />
                      </div>
                    </td>
                    <td role="cell" data-label="Cash Out" className="px-4 py-3 text-right">
                      <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                        <AmtCell amount={outgoing} />
                      </div>
                    </td>
                    <td
                      role="cell"
                      data-label="Transactions"
                      className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                        {p.transactions?.length || 0}{" "}
                      </div>
                    </td>
                    <td
                      role="cell"
                      data-label="Status" className="px-4 py-3 text-center">
                      <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                        <StatusBadge status={status} />
                      </div>
                    </td>
                    <td
                      role="cell"
                      data-label="Created by"
                      className="px-4 py-3 text-xs"
                    >
                      <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
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
                      </div>
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
                Player Number
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
