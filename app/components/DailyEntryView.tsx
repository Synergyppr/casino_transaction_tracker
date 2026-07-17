"use client";
import { useState, useMemo } from "react";
import {
  Search,
  UserPlus,
  X,
  FileEditIcon,
  ChevronLeft,
  ChevronRight,
  EyeIcon,
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
  updatePlayerApi,
} from "../lib/api";
import { StatusBadge } from "./StatusBadge";
import { AmtCell } from "./AmtCell";
import AllPlayerTransactionsModal from "./modals/AllPlayerTransactionsModal";
import ManageTransactionModal from "./modals/ManageTransactionModal";
import DuplicatePlayerModal from "./modals/DuplicatePlayerModal";
import AddPlayerModal from "./modals/AddPlayerModal";
import EditPlayerModal, {
  type EditPlayerDraft,
} from "./modals/EditPlayerModal";

const PLAYERS_PER_PAGE = 15;

export interface TxnDraft {
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

export interface PlayerDraft {
  firstName: string;
  lastName: string;
  gamerNumber: string;
  phone: string;
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
  const [playerDraft, setPlayerDraft] = useState<PlayerDraft>({
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
  const [editPlayerModal, setEditPlayerModal] =
    useState<EditPlayerDraft | null>(null);
  const [editPlayerError, setEditPlayerError] = useState("");

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

  function openEditPlayer(player: Player) {
    const apiPlayer = apiPlayers.find((item) => item.id === player.id);
    const { firstName, lastName } = splitPlayerName(
      apiPlayer?.name || player.name
    );

    const apiPlayerDetails = apiPlayer as
      | (ApiPlayer & {
          phone?: string | null;
          active?: boolean;
        })
      | undefined;

    setEditPlayerError("");
    setEditPlayerModal({
      id: player.id,
      firstName,
      lastName,
      gamerNumber: apiPlayer?.gamerNumber || player.gamerNumber || "",
      phone: apiPlayerDetails?.phone ? String(apiPlayerDetails.phone) : "",
      active: apiPlayerDetails?.active ?? true,
    });
  }

  function closeEditPlayer() {
    if (saving) return;

    setEditPlayerModal(null);
    setEditPlayerError("");
  }

  async function submitPlayerUpdate() {
    if (!editPlayerModal || saving) return;

    const firstName = editPlayerModal.firstName.trim();
    const lastName = editPlayerModal.lastName.trim();
    const gamerNumber = editPlayerModal.gamerNumber.trim();
    const phone = editPlayerModal.phone.trim();

    if (!firstName) {
      setEditPlayerError("First name is required.");
      return;
    }

    if (!lastName) {
      setEditPlayerError("Last name is required.");
      return;
    }

    if (!gamerNumber) {
      setEditPlayerError("Gamer number is required.");
      return;
    }

    setSaving(true);
    setEditPlayerError("");

    try {
      await updatePlayerApi({
        id: editPlayerModal.id,
        gamerNumber,
        firstName,
        lastName,
        phone,
        active: editPlayerModal.active,
        updatedBy: user.name,
      });

      const updatedName = `${firstName} ${lastName}`.trim();

      setPlayers((previousPlayers) =>
        previousPlayers.map((player) =>
          player.id === editPlayerModal.id
            ? {
                ...player,
                name: updatedName,
                gamerNumber,
              }
            : player
        )
      );

      setListModal((currentPlayer) =>
        currentPlayer?.id === editPlayerModal.id
          ? {
              ...currentPlayer,
              name: updatedName,
              gamerNumber,
            }
          : currentPlayer
      );

      setTxnModal((currentTransaction) =>
        currentTransaction?.playerId === editPlayerModal.id
          ? {
              ...currentTransaction,
              playerName: updatedName,
            }
          : currentTransaction
      );

      setEditPlayerModal(null);
      await onDataChange();
    } catch (error) {
      setEditPlayerError(
        error instanceof Error ? error.message : "Failed to update player"
      );
    } finally {
      setSaving(false);
    }
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
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditPlayer(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs bg-secondary hover:bg-accent/20 border border-border rounded-sm transition-colors text-foreground"
                        >
                          <FileEditIcon size={12} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => openTxn(p)}
                          className="px-3 py-1 text-xs bg-secondary hover:bg-accent/20 border border-border rounded-sm transition-colors text-foreground"
                        >
                          + Transaction
                        </button>

                        {p.transactions.length > 0 && (
                          <button
                            onClick={() => setListModal(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs bg-secondary hover:bg-accent/20 border border-border rounded-sm transition-colors text-foreground"
                          >
                            <EyeIcon size={12} /> Transactions
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
        <AddPlayerModal
          playerDraft={playerDraft}
          setPlayerDraft={setPlayerDraft}
          resetPlayerDraft={resetPlayerDraft}
          handleAddPlayer={handleAddPlayer}
          saving={saving}
          playerError={playerError}
          setPlayerError={setPlayerError}
          handleGamerNumberLookup={handleGamerNumberLookup}
          playerLookupLoading={playerLookupLoading}
          playerLookupMessage={playerLookupMessage}
          setPlayerLookupMessage={setPlayerLookupMessage}
        />
      )}

      {/* Edit player modal */}
      {editPlayerModal && (
        <EditPlayerModal
          playerDraft={editPlayerModal}
          setPlayerDraft={setEditPlayerModal}
          saving={saving}
          error={editPlayerError}
          setError={setEditPlayerError}
          onClose={closeEditPlayer}
          onSubmit={submitPlayerUpdate}
        />
      )}

      {/* Duplicate modal */}
      {dupModal && (
        <DuplicatePlayerModal
          dupModal={dupModal}
          setDupModal={setDupModal}
          openTxn={openTxn}
          createPlayer={createPlayer}
          resetPlayerDraft={resetPlayerDraft}
          saving={saving}
          fmt={fmt}
        />
      )}

      {/* Add / update transaction modal */}
      {txnModal && (
        <ManageTransactionModal
          txnModal={txnModal}
          setTxnModal={setTxnModal}
          txnError={txnError}
          setTxnError={setTxnError}
          amountFocused={amountFocused}
          setAmountFocused={setAmountFocused}
          customCategory={customCategory}
          setCustomCategory={setCustomCategory}
          cashInCategory={cashInCategory}
          setCashInCategory={setCashInCategory}
          cashOutCategory={cashOutCategory}
          setCashOutCategory={setCashOutCategory}
          saving={saving}
          submitTxn={submitTxn}
        />
      )}

      {/* List Modal */}
      {listModal && (
        <AllPlayerTransactionsModal
          listModal={listModal}
          setListModal={setListModal}
          openTxn={openTxn}
          fmt={fmt}
        />
      )}
    </div>
  );
}
