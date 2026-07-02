"use client";
import { useState, useMemo } from "react";
import {
  Search,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  UserPlus,
  X,
  Loader2,
  FileEditIcon,
} from "lucide-react";
import type {
  Cashier,
  Direction,
  Player,
  Transaction,
  ApiPlayer,
} from "../lib/types";
import { CASH_IN_TYPES, CASH_OUT_TYPES, TODAY } from "../lib/constants";
import { getPlayerTotals, getStatus, fmt } from "../lib/utils";
import {
  createPlayerApi,
  createTransactionApi,
  updateTransactionApi,
  mapApiTransaction,
} from "../lib/api";
import { StatusBadge } from "./StatusBadge";
import { AmtCell } from "./AmtCell";
import { Modal } from "./Modal";

interface TxnDraft {
  id?: string;
  mode: "create" | "update";
  playerId: string;
  playerName: string;
  direction: Direction;
  category: string;
  amount: string;
  notes?: string;
  reason?: string;
}

export function normalizeDate(value?: string): string {
  if (!value) return "";

  // Already ISO (2026-06-30 or 2026-06-30T12:34:56Z)
  if (value.includes("-")) {
    return value.split("T")[0];
  }

  // MM/DD/YYYY hh:mm AM/PM
  const [datePart] = value.split(" ");
  const [month, day, year] = datePart.split("/");

  if (!month || !day || !year) return "";

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function getDateOnly(value?: string) {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value;
}

function normalizeApiPlayerToPlayer(apiPlayer: ApiPlayer): Player {
  return {
    id: apiPlayer.id,
    gamerNumber: apiPlayer.gamerNumber,
    name: apiPlayer.name || "Unknown",
    date: getDateOnly(apiPlayer.date) || TODAY,
    transactions:
      apiPlayer?.transactions?.map((t) => ({
        id: t.id,
        direction:
          t.direction === "outgoing"
            ? ("outgoing" as const)
            : ("incoming" as const),
        category: t.category || "Other",
        amount: Number(t.amount) || 0,
        timestamp: apiPlayer.date || "",
        cashierId: t.createdByCashierId || "",
        cashierName: t.cashierName,
      })) || [],
    createdBy: apiPlayer.createdBy || "",
  };
}

export function DailyEntryView({
  players,
  setPlayers,
  user,
  apiPlayers,
  onDataChange,
  onTransactionCreated,
  selectedDate,
}: {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  user: Cashier;
  apiPlayers: ApiPlayer[];
  onDataChange: () => Promise<void>;
  onTransactionCreated: (playerId: string, txn: Transaction) => void;
  selectedDate: string;
}) {
  const [search, setSearch] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [playerDraft, setPlayerDraft] = useState({
    firstName: "",
    lastName: "",
    gamerNumber: "",
    phone: "",
  });
  const [playerError, setPlayerError] = useState("");
  const [dupModal, setDupModal] = useState<{ matches: Player[] } | null>(null);
  const [txnModal, setTxnModal] = useState<TxnDraft | null>(null);
  const [listModal, setListModal] = useState<Player | null>(null);
  const [txnError, setTxnError] = useState("");
  const [saving, setSaving] = useState(false);

  const visiblePlayers = useMemo(() => {
    const apiPlayersForDate = apiPlayers
      .filter((p) => normalizeDate(p.date) === selectedDate)
      .map(normalizeApiPlayerToPlayer);

    const localOnlyPlayers = players.filter(
      (p) =>
        normalizeDate(p.date) === selectedDate &&
        !apiPlayersForDate.some((apiP) => apiP.id === p.id)
    );

    return [...apiPlayersForDate, ...localOnlyPlayers];
  }, [apiPlayers, players, selectedDate]);

  const todayPlayers = visiblePlayers;

  const displayed = search
    ? todayPlayers.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    : todayPlayers;

  function handleAddPlayer() {
    const fullName =
      `${playerDraft.firstName.trim()} ${playerDraft.lastName.trim()}`.trim();

    if (!fullName) return;

    const matches = todayPlayers.filter(
      (p) =>
        p.name.toLowerCase().includes(fullName.slice(0, 5).toLowerCase()) ||
        fullName.toLowerCase().includes(p.name.slice(0, 5).toLowerCase())
    );

    if (matches.length > 0) {
      setDupModal({ matches });
    } else {
      createPlayer();
    }
  }

  async function createPlayer() {
    setSaving(true);

    try {
      const firstName = playerDraft.firstName.trim();
      const lastName = playerDraft.lastName.trim();
      const gamerNumber =
        playerDraft.gamerNumber.trim() ||
        `GMR-${Date.now().toString(36).toUpperCase()}`;
      const phone = playerDraft.phone.trim() || undefined;

      const apiPlayer = await createPlayerApi({
        firstName,
        lastName,
        gamerNumber,
        phone,
        createdBy: user.name,
      });

      const p: Player = {
        id: apiPlayer.id,
        name: apiPlayer.name || `${firstName} ${lastName}`.trim(),
        date: TODAY,
        transactions: [],
        createdBy: user.name,
        gamerNumber: apiPlayer.gamerNumber,
      };

      setPlayers((prev) => [...prev, p]);
      resetPlayerDraft();
      setDupModal(null);
      openTxn(p);
      onDataChange();
    } catch (err) {
      setPlayerError(
        err instanceof Error ? err.message : "Failed to create player"
      );
    } finally {
      setSaving(false);
    }
  }

  function resetPlayerDraft() {
    setPlayerDraft({
      firstName: "",
      lastName: "",
      gamerNumber: "",
      phone: "",
    });
    setPlayerError("");
    setAddModal(false);
  }

  function openTxn(p: Player, txn?: Transaction) {
    setTxnModal({
      id: txn?.id,
      mode: txn ? "update" : "create",
      playerId: p.id,
      playerName: p.name,
      direction: txn?.direction || "incoming",
      category: txn?.category || CASH_IN_TYPES[0],
      amount: txn?.amount ? String(txn.amount) : "",
    });
    setTxnError("");
  }

  async function submitTxn() {
    if (!txnModal) return;

    const amt = parseFloat(txnModal.amount);

    if (!amt || amt <= 0) {
      setTxnError("Enter a valid positive amount.");
      return;
    }

    setSaving(true);

    try {
      if (txnModal.mode === "update" && txnModal.id) {
        await updateTransactionApi({
          id: txnModal.id,
          updatedByCashierId: user.id,
          direction: txnModal.direction,
          category: txnModal.category,
          amount: amt,
          status: "updated",
          notes: "Updated by cashier",
          reason: "Updated by cashier",
        });

        setPlayers((prev) =>
          prev.map((p) =>
            p.id === txnModal.playerId
              ? {
                  ...p,
                  transactions: p.transactions.map((t) =>
                    t.id === txnModal.id
                      ? {
                          ...t,
                          direction: txnModal.direction,
                          category: txnModal.category,
                          amount: amt,
                        }
                      : t
                  ),
                }
              : p
          )
        );
      } else {
        const apiTxn = await createTransactionApi({
          playerId: txnModal.playerId,
          createdByCashierId: user.id,
          direction: txnModal.direction,
          category: txnModal.category,
          amount: amt,
        });

        const txn = mapApiTransaction(apiTxn);

        onTransactionCreated(txnModal.playerId, txn);

        setPlayers((prev) =>
          prev.map((p) =>
            p.id === txnModal.playerId
              ? { ...p, transactions: [...p.transactions, txn] }
              : p
          )
        );
      }

      setTxnModal(null);
      setTxnError("");
      await onDataChange();
    } catch (err) {
      setTxnError(
        err instanceof Error
          ? err.message
          : txnModal.mode === "update"
          ? "Failed to update transaction"
          : "Failed to record transaction"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5">
      {/* Add player button */}
      <div className="mb-5 flex">
        <button
          onClick={() => setAddModal(true)}
          className="flex items-center gap-2 px-4 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors"
        >
          <UserPlus size={13} />
          Add Player
        </button>
      </div>

      {/* Search + count */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
          Today&apos;s Players
          <span className="ml-2 text-foreground">{todayPlayers.length}</span>
        </p>

        <div className="sm:ml-auto flex items-center gap-2 h-8 px-3 bg-secondary border border-border rounded-sm w-full sm:w-52">
          <Search size={12} className="text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Players table */}
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
              <th className="text-center px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Status
              </th>
              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium"></th>
            </tr>
          </thead>

          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-muted-foreground text-sm"
                >
                  {search
                    ? "No matching players."
                    : "No players for today. Register one above."}
                </td>
              </tr>
            ) : (
              displayed.map((p, i) => {
                const { incoming, outgoing } = getPlayerTotals(p);
                const status = getStatus(incoming, outgoing);

                return (
                  <>
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
                      <td className="px-4 py-3">
                        <p className="font-semibold">{p.name}</p>
                        {p.gamerNumber && (
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {p.gamerNumber}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <AmtCell amount={incoming} />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <AmtCell amount={outgoing} />
                      </td>

                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={status} />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openTxn(p)}
                            className="px-3 py-1 text-xs bg-secondary hover:bg-accent/20 border border-border rounded-sm transition-colors text-foreground"
                          >
                            + Transaction
                          </button>

                          {p.transactions.length > 0 && (
                            <button
                              onClick={() => setListModal(p)}
                              className="px-3 py-1 text-xs bg-secondary hover:bg-accent/20 border border-border rounded-sm transition-colors text-foreground"
                            >
                              Transactions
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add player modal */}
      {addModal && (
        <Modal onClose={resetPlayerDraft}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold">Register Player</h3>
            <button
              onClick={resetPlayerDraft}
              className="text-muted-foreground hover:text-foreground"
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
                  value={playerDraft.firstName}
                  onChange={(e) => {
                    setPlayerDraft((p) => ({
                      ...p,
                      firstName: e.target.value,
                    }));
                    setPlayerError("");
                  }}
                  placeholder="First name"
                  disabled={saving}
                  className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                  Last Name
                </label>
                <input
                  value={playerDraft.lastName}
                  onChange={(e) => {
                    setPlayerDraft((p) => ({
                      ...p,
                      lastName: e.target.value,
                    }));
                    setPlayerError("");
                  }}
                  placeholder="Last name"
                  disabled={saving}
                  className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Gamer Number (optional)
              </label>
              <input
                value={playerDraft.gamerNumber}
                onChange={(e) =>
                  setPlayerDraft((p) => ({
                    ...p,
                    gamerNumber: e.target.value,
                  }))
                }
                placeholder="Auto-generated if empty"
                disabled={saving}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Phone (optional)
              </label>
              <input
                value={playerDraft.phone}
                onChange={(e) =>
                  setPlayerDraft((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="(555) 123-4567"
                disabled={saving}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
              />
            </div>

            {playerError && (
              <p className="text-xs text-destructive">{playerError}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddPlayer}
              disabled={
                !playerDraft.firstName.trim() ||
                !playerDraft.lastName.trim() ||
                saving
              }
              className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Register Player
            </button>

            <button
              onClick={resetPlayerDraft}
              className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Duplicate modal */}
      {dupModal && (
        <Modal onClose={() => setDupModal(null)}>
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle
              size={16}
              className="text-amber-400 shrink-0 mt-0.5"
            />

            <div>
              <h3 className="text-sm font-semibold">
                Possible Duplicate Player
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                A similar name already exists for today. How would you like to
                proceed?
              </p>
            </div>
          </div>

          <div className="bg-secondary border border-border rounded-sm p-3 mb-4 space-y-2">
            {dupModal.matches.map((m) => {
              const { incoming, outgoing } = getPlayerTotals(m);

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-foreground">
                    {m.name}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    IN {fmt(incoming)} &middot; OUT {fmt(outgoing)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => {
                openTxn(dupModal.matches[0]);
                setDupModal(null);
                resetPlayerDraft();
              }}
              className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors"
            >
              Use Existing Record
            </button>

            <button
              onClick={() => createPlayer()}
              disabled={saving}
              className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors disabled:opacity-50"
            >
              Create Separate
            </button>

            <button
              onClick={() => setDupModal(null)}
              className="w-full sm:w-9 h-9 bg-secondary border border-border rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </Modal>
      )}

      {/* Add / update transaction modal */}
      {txnModal && (
        <Modal
          onClose={() => {
            setTxnModal(null);
            setTxnError("");
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold">
                {txnModal.mode === "update"
                  ? "Update Transaction"
                  : "Add Transaction"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {txnModal.playerName}
              </p>
            </div>

            <button
              onClick={() => {
                setTxnModal(null);
                setTxnError("");
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Direction */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
              Direction
            </label>

            <div className="flex gap-2">
              {(["incoming", "outgoing"] as Direction[]).map((dir) => (
                <button
                  key={dir}
                  onClick={() =>
                    setTxnModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            direction: dir,
                            category:
                              dir === "incoming"
                                ? CASH_IN_TYPES[0]
                                : CASH_OUT_TYPES[0],
                          }
                        : prev
                    )
                  }
                  className={`flex-1 h-9 rounded-sm text-sm flex items-center justify-center gap-2 transition-colors border ${
                    txnModal.direction === dir
                      ? dir === "incoming"
                        ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                        : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {dir === "incoming" ? (
                    <ArrowDownCircle size={13} />
                  ) : (
                    <ArrowUpCircle size={13} />
                  )}
                  {dir === "incoming" ? "Cash In" : "Cash Out"}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
              Category
            </label>

            <select
              value={txnModal.category}
              onChange={(e) =>
                setTxnModal((prev) =>
                  prev ? { ...prev, category: e.target.value } : prev
                )
              }
              className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
            >
              {(txnModal.direction === "incoming"
                ? CASH_IN_TYPES
                : CASH_OUT_TYPES
              ).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="mb-5">
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
              Amount (USD)
            </label>

            <input
              type="number"
              value={txnModal.amount}
              onChange={(e) =>
                setTxnModal((prev) =>
                  prev ? { ...prev, amount: e.target.value } : prev
                )
              }
              onKeyDown={(e) => e.key === "Enter" && submitTxn()}
              placeholder="0"
              disabled={saving}
              className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
              min="0"
              step="1"
              autoFocus
            />

            {txnError && (
              <p className="text-xs text-destructive mt-1.5">{txnError}</p>
            )}
          </div>

          {txnModal.mode === "update" && (
            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                  Status
                </label>

                {(() => {
                  const amount = Number(txnModal.amount) || 0;

                  const status =
                    amount >= 10000
                      ? {
                          label: "COMPLIANCE REQ.",
                          className:
                            "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
                        }
                      : amount >= 7500
                      ? {
                          label: "APPROACHING",
                          className:
                            "text-amber-400 border-amber-500/30 bg-amber-500/10",
                        }
                      : {
                          label: "NORMAL",
                          className:
                            "text-foreground border-border bg-secondary",
                        };

                  return (
                    <div
                      className={`h-9 px-3 rounded-sm border flex items-center font-mono text-sm font-semibold ${status.className}`}
                    >
                      {status.label}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                  Notes
                </label>

                <textarea
                  value={txnModal?.notes || ""}
                  onChange={(e) =>
                    setTxnModal((prev) =>
                      prev ? { ...prev, notes: e.target.value } : prev
                    )
                  }
                  placeholder="Optional notes..."
                  disabled={saving}
                  rows={3}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-sm text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                  Reason for Update
                </label>

                <textarea
                  value={txnModal?.reason || ""}
                  onChange={(e) =>
                    setTxnModal((prev) =>
                      prev ? { ...prev, reason: e.target.value } : prev
                    )
                  }
                  placeholder="Explain why this transaction is being updated..."
                  disabled={saving}
                  rows={3}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-sm text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50 resize-none"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={submitTxn}
              disabled={saving}
              className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {txnModal.mode === "update"
                ? "Update Transaction"
                : "Record Transaction"}
            </button>

            <button
              onClick={() => {
                setTxnModal(null);
                setTxnError("");
              }}
              className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* List Modal */}
      {listModal && (
        <Modal onClose={() => setListModal(null)}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold">Transactions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {listModal.name}
              </p>
            </div>

            <button
              onClick={() => setListModal(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-2">
            {listModal.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No transactions recorded.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {listModal.transactions.map((txn) => (
                  <button
                    key={txn.id}
                    onClick={() => {
                      openTxn(listModal, txn);
                      setListModal(null);
                    }}
                    className={`px-2.5 py-1 rounded-sm border text-[11px] font-mono transition-colors ${
                      txn.direction === "incoming"
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/25 hover:bg-sky-500/15"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/25 hover:bg-rose-500/15"
                    }`}
                  >
                    {txn.direction === "incoming" ? "IN" : "OUT"} ·{" "}
                    {txn.category} · {fmt(txn.amount)} ·{" "}
                    <FileEditIcon
                      size={10}
                      className="inline text-accent cursor-pointer"
                    />{" "}
                    {/* ·{" "}
                    <LockIcon
                      size={10}
                      className="inline text-orange-400 cursor-pointer"
                    />{" "}
                    ·{" "}
                    <CopyIcon
                      size={10}
                      className="inline text-purple-400 cursor-pointer"
                    /> */}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
