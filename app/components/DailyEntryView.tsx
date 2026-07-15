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
  ChevronLeft,
  ChevronRight,
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
  getPlayerByGamerNumber,
} from "../lib/api";
import { StatusBadge } from "./StatusBadge";
import { AmtCell } from "./AmtCell";
import { Modal } from "./Modal";

const PLAYERS_PER_PAGE = 15;

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logout,
}: {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  user: Cashier;
  apiPlayers: ApiPlayer[];
  onDataChange: () => Promise<void>;
  onTransactionCreated: (playerId: string, txn: Transaction) => void;
  selectedDate: string;
  logout?: () => void;
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
  const [playerLookupLoading, setPlayerLookupLoading] = useState(false);
  const [playerLookupMessage, setPlayerLookupMessage] = useState("");
  const [cashInCategory, setCashInCategory] = useState(CASH_IN_TYPES[0]);
  const [cashOutCategory, setCashOutCategory] = useState(CASH_OUT_TYPES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [amountFocused, setAmountFocused] = useState(false);

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

  const normalizedSearch = search.trim().toLowerCase();

  const displayed = useMemo(
    () =>
      normalizedSearch
        ? todayPlayers.filter((p) => {
            const normalizedName = (p.name || "").toLowerCase();
            const [firstName = "", ...lastNameParts] =
              normalizedName.split(/\s+/);
            const lastName = lastNameParts.join(" ");
            const gamerNumber = String(p.gamerNumber || "").toLowerCase();

            return (
              firstName.includes(normalizedSearch) ||
              lastName.includes(normalizedSearch) ||
              normalizedName.includes(normalizedSearch) ||
              gamerNumber.includes(normalizedSearch)
            );
          })
        : todayPlayers,
    [todayPlayers, normalizedSearch]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(displayed.length / PLAYERS_PER_PAGE)
  );

  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedPlayers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PLAYERS_PER_PAGE;

    return displayed.slice(startIndex, startIndex + PLAYERS_PER_PAGE);
  }, [displayed, safeCurrentPage]);

  const firstVisiblePlayer =
    displayed.length > 0 ? (safeCurrentPage - 1) * PLAYERS_PER_PAGE + 1 : 0;

  const lastVisiblePlayer = Math.min(
    safeCurrentPage * PLAYERS_PER_PAGE,
    displayed.length
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handlePreviousPage() {
    setCurrentPage((page) => {
      const normalizedPage = Math.min(Math.max(page, 1), totalPages);

      return Math.max(1, normalizedPage - 1);
    });
  }

  function handleNextPage() {
    setCurrentPage((page) => {
      const normalizedPage = Math.min(Math.max(page, 1), totalPages);

      return Math.min(totalPages, normalizedPage + 1);
    });
  }

  function splitPlayerName(fullName?: string) {
    const cleanName = String(fullName || "").trim();

    if (!cleanName) {
      return { firstName: "", lastName: "" };
    }

    const [firstName = "", ...lastNameParts] = cleanName.split(/\s+/);

    return {
      firstName,
      lastName: lastNameParts.join(" "),
    };
  }

  async function handleGamerNumberLookup() {
    const gamerNumber = playerDraft.gamerNumber.trim();

    if (!gamerNumber || playerLookupLoading || saving) return;

    setPlayerLookupLoading(true);
    setPlayerLookupMessage("");
    setPlayerError("");

    try {
      const response = await getPlayerByGamerNumber(gamerNumber);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiPlayer = (response as { data?: ApiPlayer } | ApiPlayer | any)
        ?.data
        ? (response as unknown as { data: ApiPlayer }).data
        : (response as ApiPlayer);

      if (!apiPlayer?.id) {
        setPlayerLookupMessage("No player found for this gamer number.");
        return;
      }

      const { firstName, lastName } = splitPlayerName(apiPlayer.name);

      setPlayerDraft((prev) => ({
        ...prev,
        firstName: firstName || prev.firstName,
        lastName: lastName || prev.lastName,
        gamerNumber: apiPlayer.gamerNumber || prev.gamerNumber,
        phone:
          "phone" in apiPlayer && apiPlayer.phone
            ? String(apiPlayer.phone)
            : prev.phone,
      }));

      setPlayerLookupMessage("Player details loaded.");
    } catch (err) {
      setPlayerLookupMessage("");
      setPlayerError(
        err instanceof Error ? err.message : "Failed to load player details"
      );
    } finally {
      setPlayerLookupLoading(false);
    }
  }

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
    setPlayerLookupMessage("");
    setPlayerLookupLoading(false);
    setAddModal(false);
  }

  function openTxn(p: Player, txn?: Transaction) {
    const direction = txn?.direction || "incoming";
    const category =
      txn?.category ||
      (direction === "incoming" ? cashInCategory : cashOutCategory);

    if (txn?.category) {
      if (direction === "incoming") {
        setCashInCategory(txn.category);
      } else {
        setCashOutCategory(txn.category);
      }
    }

    setTxnModal({
      id: txn?.id,
      mode: txn ? "update" : "create",
      playerId: p.id,
      playerName: p.name,
      direction,
      category,
      amount: txn?.amount ? String(txn.amount) : "",
    });
    setTxnError("");
  }

  const validate = () => {
    if (!txnModal) return false;

    const amt = parseFloat(txnModal.amount);

    if (!amt || amt <= 0) {
      setTxnError("Enter a valid positive amount.");
      return false;
    }

    // Require notes and reason if updating
    if (txnModal.mode === "update") {
      if (!txnModal.notes?.trim()) {
        setTxnError("Please provide notes for the update.");
        return false;
      }

      if (!txnModal.reason?.trim()) {
        setTxnError("Please provide a reason for the update.");
        return false;
      }
    }

    return true;
  };

  async function submitTxn() {
    const amt = parseFloat(txnModal?.amount as string);

    validate();
    if (validate() === false || !txnModal) return;

    setSaving(true);

    try {
      if (txnModal.mode === "update" && txnModal.id) {
        await updateTransactionApi({
          id: txnModal.id,
          updatedByCashierId: user.id,
          direction: txnModal.direction,
          category: txnModal?.category?.includes("Other")
            ? customCategory || txnModal.category
            : txnModal.category,
          amount: amt,
          status: "updated",
          notes: txnModal.notes || "",
          reason: txnModal.reason || "",
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
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search name or gamer #"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => handleSearchChange("")}
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
              paginatedPlayers.map((p, i) => {
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
                        : ((safeCurrentPage - 1) * PLAYERS_PER_PAGE + i) % 2 ===
                          1
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {displayed.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-x border-b border-border rounded-b bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {firstVisiblePlayer}–{lastVisiblePlayer} of{" "}
            {displayed.length} players
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreviousPage}
              disabled={safeCurrentPage === 1}
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-border bg-secondary px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={13} />
              Previous
            </button>

            <span className="min-w-20 text-center text-xs text-muted-foreground font-mono">
              Page {safeCurrentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={safeCurrentPage === totalPages}
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-border bg-secondary px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              Next
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

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
              <div className="flex gap-2">
                <input
                  value={playerDraft.gamerNumber}
                  onChange={(e) => {
                    setPlayerDraft((p) => ({
                      ...p,
                      gamerNumber: e.target.value,
                    }));
                    setPlayerLookupMessage("");
                    setPlayerError("");
                  }}
                  onBlur={handleGamerNumberLookup}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleGamerNumberLookup();
                    }
                  }}
                  placeholder="Auto-generated if empty"
                  disabled={saving || playerLookupLoading}
                  className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={handleGamerNumberLookup}
                  disabled={
                    saving ||
                    playerLookupLoading ||
                    !playerDraft.gamerNumber.trim()
                  }
                  className="h-9 px-3 bg-secondary border border-border rounded-sm text-xs text-foreground hover:bg-accent/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {playerLookupLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Search size={12} />
                  )}
                  Lookup
                </button>
              </div>

              {playerLookupMessage && (
                <p className="text-xs text-emerald-400 mt-1.5">
                  {playerLookupMessage}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
                Phone (optional)
              </label>
              <input
                value={(() => {
                  const digits = playerDraft.phone
                    .replace(/\D/g, "")
                    .slice(0, 10);

                  if (digits.length <= 3) return digits;
                  if (digits.length <= 6)
                    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;

                  return `(${digits.slice(0, 3)}) ${digits.slice(
                    3,
                    6
                  )}-${digits.slice(6)}`;
                })()}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);

                  setPlayerDraft((p) => ({
                    ...p,
                    phone: digits,
                  }));
                }}
                placeholder="(787) 888-9890"
                disabled={saving}
                inputMode="numeric"
                autoComplete="tel"
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
              {playerLookupMessage ? "Record Transaction" : "Register Player"}
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
                                ? cashInCategory
                                : cashOutCategory,
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
              onChange={(e) => {
                const nextCategory = e.target.value;

                if (txnModal.direction === "incoming") {
                  setCashInCategory(nextCategory);
                } else {
                  setCashOutCategory(nextCategory);
                }

                setTxnModal((prev) =>
                  prev ? { ...prev, category: nextCategory } : prev
                );
              }}
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

            {txnModal?.category?.includes("Other") && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Specify category..."
                disabled={saving}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50 mt-2"
              />
            )}
          </div>

          {/* Amount */}
          {/* Amount */}
          <div className="mb-5">
            <label
              htmlFor="currency"
              className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider"
            >
              Amount (USD)
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-muted-foreground">
                $
              </span>

              <input
                type="text"
                id="currency"
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={
                  amountFocused
                    ? txnModal.amount
                    : txnModal.amount
                    ? Number(txnModal.amount).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : ""
                }
                onFocus={(e) => {
                  setAmountFocused(true);

                  requestAnimationFrame(() => {
                    e.target.select();
                  });
                }}
                onBlur={() => {
                  setAmountFocused(false);

                  const amount = Number(txnModal.amount);

                  if (!Number.isFinite(amount) || amount <= 0) return;

                  setTxnModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          amount: Math.min(amount, 1000000).toFixed(2),
                        }
                      : prev
                  );
                }}
                onChange={(e) => {
                  let value = e.target.value
                    .replace(/[$,\s]/g, "")
                    .replace(/[^\d.]/g, "");

                  const decimalIndex = value.indexOf(".");

                  if (decimalIndex !== -1) {
                    value =
                      value.slice(0, decimalIndex + 1) +
                      value
                        .slice(decimalIndex + 1)
                        .replace(/\./g, "")
                        .slice(0, 2);
                  }

                  if (value.startsWith(".")) {
                    value = `0${value}`;
                  }

                  const numericValue = Number(value);

                  if (
                    value !== "" &&
                    value !== "0." &&
                    Number.isFinite(numericValue) &&
                    numericValue > 1000000
                  ) {
                    value = "1000000";
                  }

                  setTxnModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          amount: value,
                        }
                      : prev
                  );

                  setTxnError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitTxn();
                  }
                }}
                disabled={saving}
                className="w-full h-9 pl-8 pr-3 bg-secondary border border-border rounded-sm text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
                autoFocus
              />
            </div>

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
                    amount >= 1000000
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
                    />
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
