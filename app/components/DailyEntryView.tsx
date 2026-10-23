"use client";
import { PageHeading } from "./PageHeading";
import { Fragment, useState, useMemo, useRef } from "react";
import {
  Search,
  Plus,
  List,
  UserPlus,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
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
  searchPlayersByName,
  mapApiPlayer,
} from "../lib/api";
import { StatusBadge } from "./StatusBadge";
import { AmtCell } from "./AmtCell";
import { PlayerTransactionsSection } from "./PlayerTransactionsSection";
import ManageTransactionModal from "./modals/ManageTransactionModal";
import DuplicatePlayerModal from "./modals/DuplicatePlayerModal";
import AddPlayerModal from "./modals/AddPlayerModal";

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
  date?: string;
  originalCategory?: string;
  originalAmount?: string;
  originalNotes?: string;
  createdAt?: string;
  createdByCashierId?: string;
  updatedAt?: string;
  updatedByCashierId?: string;
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
    ...mapApiPlayer(apiPlayer),
    id: apiPlayer.id,
    gamerNumber: apiPlayer.gamerNumber,
    name: apiPlayer.name || "Unknown",
    date: getDateOnly(apiPlayer.date) || "",
    // date: apiPlayer?.date || "",
    transactions:
      apiPlayer?.transactions?.map((t) => ({
        id: t.id,
        direction:
          t.direction === "outgoing"
            ? ("outgoing" as const)
            : ("incoming" as const),
        category: t.category || "Other",
        amount: Number(t.amount) || 0,
        date: t.date || "",
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
  const [nameQuery, setNameQuery] = useState("");
  const [nameMatches, setNameMatches] = useState<ApiPlayer[]>([]);
  const [nameSearched, setNameSearched] = useState(false);
  const mutationPending = useRef(false);
  const [lookedUpPlayer, setLookedUpPlayer] = useState<Player | null>(null);
  const playerLookupRequest = useRef(0);
  const playerLookupPending = useRef(false);
  const [playerError, setPlayerError] = useState("");
  const [dupModal, setDupModal] = useState<{ matches: Player[] } | null>(null);
  const [txnModal, setTxnModal] = useState<TxnDraft | null>(null);
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());

  const toggleTransactions = (id: string) => setExpandedPlayers(previous => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id);
    else next.add(id); return next;
  });

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

      .map(normalizeApiPlayerToPlayer);

    const localOnlyPlayers = players.filter(
      (p) =>

        !apiPlayersForDate.some((apiP) => apiP.id === p.id)
    );

    const mergedPlayers = apiPlayersForDate.map((apiPlayer) => {
      const local = players.find((player) => player.id === apiPlayer.id);
      if (!local) return apiPlayer;
      const transactions = new Map(local.transactions.map((txn) => [txn.id, txn]));
      apiPlayer.transactions.forEach((txn) => transactions.set(txn.id, txn));
      return { ...apiPlayer, transactions: [...transactions.values()] };
    });

    return [...mergedPlayers, ...localOnlyPlayers];
  }, [apiPlayers, players]);

  const todayPlayers = visiblePlayers;

  const normalizedSearch = search.trim().toLowerCase();

  const displayed = useMemo(() => {
    const filtered = normalizedSearch
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
      : todayPlayers;

    return [...filtered].sort((a, b) => {
      const [firstA = "", ...lastA] = (a.name || "")
        .trim()
        .toLowerCase()
        .split(/\s+/);
      const [firstB = "", ...lastB] = (b.name || "")
        .trim()
        .toLowerCase()
        .split(/\s+/);

      return (
        firstA.localeCompare(firstB) ||
        lastA.join(" ").localeCompare(lastB.join(" ")) ||
        (a.gamerNumber || "").localeCompare(b.gamerNumber || "")
      );
    });
  }, [todayPlayers, normalizedSearch]);

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

    if (!gamerNumber || playerLookupPending.current || saving) return;

    const requestId = ++playerLookupRequest.current;
    playerLookupPending.current = true;
    setPlayerLookupLoading(true);
    setPlayerLookupMessage("");
    setPlayerError("");
    setLookedUpPlayer(null);

    try {
      const response = await getPlayerByGamerNumber(gamerNumber);

      if (requestId !== playerLookupRequest.current) return;

      if (!response?.id) {
        setPlayerError("No player found for this player number.");
        return;
      }

      selectLookupPlayer(response);
    } catch (err) {
      if (requestId !== playerLookupRequest.current) return;

      setPlayerLookupMessage("");
      setPlayerError(
        err instanceof Error ? err.message : "Failed to load player details"
      );
    } finally {
      if (requestId === playerLookupRequest.current) {
        playerLookupPending.current = false;
        setPlayerLookupLoading(false);
      }
    }
  }

  function selectLookupPlayer(apiPlayer: ApiPlayer) {
    const nameParts = splitPlayerName(apiPlayer.name);
    const loaded = normalizeApiPlayerToPlayer(apiPlayer);
    setLookedUpPlayer(loaded);
    setPlayerDraft({
      firstName: apiPlayer.firstName || nameParts.firstName,
      lastName: apiPlayer.lastName || nameParts.lastName,
      gamerNumber: apiPlayer.gamerNumber || "",
      phone: apiPlayer.phone || "",
    });
    setNameMatches([]);
    setNameSearched(false);
    setPlayerError("");
    setPlayerLookupMessage(
      apiPlayer.active === false
        ? "Inactive player selected. Register again before adding a transaction."
        : "Player selected. Ready to add a transaction."
    );
  }

  function changeNameQuery(value: string) {
    playerLookupRequest.current += 1;
    playerLookupPending.current = false;
    setPlayerLookupLoading(false);
    setNameQuery(value);
    setNameMatches([]);
    setNameSearched(false);
    setPlayerError("");
  }

  async function handleNameLookup() {
    if (!nameQuery.trim() || saving || playerLookupPending.current) return;
    const requestId = ++playerLookupRequest.current;
    playerLookupPending.current = true;
    setPlayerLookupLoading(true);
    setPlayerError("");
    setNameMatches([]);
    setNameSearched(false);
    try {
      const matches = await searchPlayersByName(nameQuery.trim());
      if (requestId !== playerLookupRequest.current) return;
      setNameMatches(matches);
      setNameSearched(true);
    } catch (err) {
      if (requestId === playerLookupRequest.current) {
        setPlayerError(err instanceof Error ? err.message : "Failed to search players");
      }
    } finally {
      if (requestId === playerLookupRequest.current) {
        playerLookupPending.current = false;
        setPlayerLookupLoading(false);
      }
    }
  }

  async function continueWithExistingPlayer(player: Player) {
    if (mutationPending.current) return;
    if (player.active !== false) {
      resetPlayerDraft();
      openTxn(player);
      return;
    }
    setAddModal(true);
    const nameParts = splitPlayerName(player.name);
    setLookedUpPlayer(player);
    setPlayerDraft({
      firstName: player.firstName || nameParts.firstName,
      lastName: player.lastName || nameParts.lastName,
      gamerNumber: player.gamerNumber || "",
      phone: player.phone || "",
    });
    await createPlayer({
      firstName: player.firstName || nameParts.firstName,
      lastName: player.lastName || nameParts.lastName,
      gamerNumber: player.gamerNumber || "",
      phone: player.phone || "",
    }, player);
  }

  function handleAddPlayer() {
    if (saving || playerLookupPending.current || playerLookupLoading) return;

    const loadedPlayerMatchesDraft =
      lookedUpPlayer !== null &&
      String(lookedUpPlayer.gamerNumber || "").trim().toLowerCase() ===
      playerDraft.gamerNumber.trim().toLowerCase();

    if (lookedUpPlayer && loadedPlayerMatchesDraft) {
      void continueWithExistingPlayer(lookedUpPlayer);
      return;
    }

    const firstName = playerDraft.firstName.trim();
    const lastName = playerDraft.lastName.trim();
    const gamerNumber = playerDraft.gamerNumber.trim();

    const fullName = `${firstName} ${lastName}`.trim();

    if (!firstName || !lastName) {
      setPlayerError("First and last name are required.");
      return;
    }

    const normalizedFullName = fullName.toLowerCase();
    const normalizedGamerNumber = gamerNumber.toLowerCase();

    // ─────────────────────────────────────────────────────────────
    // 1. Player ID / Gamer Number takes priority
    // ─────────────────────────────────────────────────────────────
    const gamerNumberMatch = normalizedGamerNumber
      ? todayPlayers.find(
        (player) =>
          String(player.gamerNumber || "")
            .trim()
            .toLowerCase() === normalizedGamerNumber
      )
      : undefined;

    if (gamerNumberMatch) {
      void continueWithExistingPlayer(gamerNumberMatch);
      return;
    }

    // A name alone cannot identify a player; let the cashier choose.
    const nameMatches = todayPlayers.filter((player) => {
      const existingName = player.name.trim().toLowerCase();
      return existingName === normalizedFullName ||
        existingName.includes(normalizedFullName.slice(0, 5)) ||
        normalizedFullName.includes(existingName.slice(0, 5));
    });

    if (nameMatches.length > 0) {
      setDupModal({ matches: nameMatches });
      return;
    }

    createPlayer();
  }

  async function createPlayer(draft: PlayerDraft = playerDraft, existing?: Player) {
    if (mutationPending.current) return;
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      setPlayerError("First and last name are required.");
      return;
    }
    mutationPending.current = true;
    setSaving(true);

    try {
      const firstName = draft.firstName.trim();
      const lastName = draft.lastName.trim();
      const gamerNumber =
        draft.gamerNumber.trim() ||
        `GMR-${Date.now().toString(36).toUpperCase()}`;
      const phone = draft.phone.trim() || undefined;

      const payload = {
        firstName,
        lastName,
        gamerNumber,
        phone,
        createdBy: user.name || `${user.firstName} ${user.lastName}`.trim(),
        race: existing?.race || "",
        gender: existing?.gender || "",
        age: existing?.age || "",
        build: existing?.build || "",
        description: existing?.description || "",
        refused: existing?.refused ?? false,
      }

      const apiPlayer = await createPlayerApi(payload);

      const p: Player = {
        ...normalizeApiPlayerToPlayer(apiPlayer),
        name: apiPlayer.name || `${firstName} ${lastName}`.trim(),
        active: true,
      };

      setPlayers((prev) => [...prev.filter((player) => player.id !== p.id), p]);
      mutationPending.current = false;
      resetPlayerDraft();
      setDupModal(null);
      openTxn(p);
      void onDataChange().catch((err) => console.error("Player refresh failed:", err));
    } catch (err) {
      setPlayerError(
        err instanceof Error ? err.message : "Failed to create player"
      );
    } finally {
      mutationPending.current = false;
      setSaving(false);
    }
  }

  function resetPlayerDraft() {
    if (mutationPending.current) return;
    setNameQuery("");
    setNameMatches([]);
    setNameSearched(false);
    playerLookupRequest.current += 1;
    playerLookupPending.current = false;
    setLookedUpPlayer(null);
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
    if (!txn && p.active === false) {
      void continueWithExistingPlayer(p);
      return;
    }
    setCustomCategory("");
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
      amount: txn?.amount != null ? String(txn.amount) : "",
      notes:
        (txn as (Transaction & { notes?: string | null }) | undefined)?.notes ||
        "",
      date: txn?.date ? txn.date : TODAY,
      originalCategory: txn?.category || "",
      originalAmount: txn?.amount != null ? String(txn.amount) : "",
      originalNotes:
        (txn as (Transaction & { notes?: string | null }) | undefined)?.notes ||
        "",
      // createdAt: txn?.createdAt,
      // createdByCashierId: txn?.createdByCashierId,
      // updatedAt: txn?.updatedAt,
      // updatedByCashierId: txn?.updatedByCashierId,
    });
    setTxnError("");
  }

  const effectiveTxnCategory = useMemo(() => {
    if (!txnModal) return "";

    return txnModal.category.includes("Other")
      ? customCategory.trim() || txnModal.category.trim()
      : txnModal.category.trim();
  }, [txnModal, customCategory]);

  const hasTransactionChanges = useMemo(() => {
    if (!txnModal || txnModal.mode !== "update") return true;

    const currentAmount = Number.parseFloat(txnModal.amount);
    const originalAmount = Number.parseFloat(txnModal.originalAmount || "");

    const amountChanged =
      Number.isFinite(currentAmount) &&
      Number.isFinite(originalAmount) &&
      currentAmount !== originalAmount;

    const categoryChanged =
      effectiveTxnCategory.trim() !==
      String(txnModal.originalCategory || "").trim();

    const notesChanged =
      String(txnModal.notes || "").trim() !==
      String(txnModal.originalNotes || "").trim();

    return categoryChanged || amountChanged || notesChanged;
  }, [txnModal, effectiveTxnCategory]);

  const isTxnSubmitDisabled =
    saving ||
    !txnModal ||
    (txnModal.mode === "update" && !hasTransactionChanges);

  const validate = () => {
    if (!txnModal) return false;

    const amt = Number(txnModal.amount);

    if (!Number.isFinite(amt) || amt <= 0) {
      setTxnError("Enter a valid positive amount.");
      return false;
    }

    // An update must modify category, notes, or amount.
    if (txnModal.mode === "update" && !hasTransactionChanges) {
      setTxnError(
        "Change the category, notes, or amount before updating the transaction."
      );
      return false;
    }

    // Require a reason when updating.
    if (txnModal.mode === "update") {
      // if (!txnModal.notes?.trim()) {
      //   setTxnError("Please provide notes for the update.");
      //   return false;
      // }

      if (!txnModal.reason?.trim()) {
        setTxnError("Please provide a reason for the update.");
        return false;
      }
    }

    return true;
  };

  // Submit Transaction
  async function submitTxn() {
    if (!txnModal || isTxnSubmitDisabled) {
      if (txnModal?.mode === "update" && !hasTransactionChanges) {
        setTxnError(
          "Change the category, notes, or amount before updating the transaction."
        );
      }
      return;
    }

    if (!validate()) return;

    const amt = Number(txnModal.amount);

    if (mutationPending.current) return;
    mutationPending.current = true;
    setSaving(true);

    try {
      if (txnModal.mode === "update" && txnModal.id) {
        await updateTransactionApi({
          id: txnModal.id,
          updatedByCashierId: user.id,
          direction: txnModal.direction,
          category: effectiveTxnCategory,
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
                      category: effectiveTxnCategory,
                      amount: amt,
                      ...({
                        notes: txnModal.notes || "",
                      } as Partial<Transaction>),
                    }
                    : t
                ),
              }
              : p
          )
        );
      } else {
        const propertyId = JSON.parse(
          sessionStorage.getItem("casino_selected_property") || "null"
        )?.id;

        if (!propertyId) throw new Error("Select a property before adding a transaction.");

        const payload = {
          notes: txnModal.notes || "",
          playerId: txnModal.playerId,
          propertyId: propertyId,
          createdByCashierId: user.id,
          direction: txnModal.direction,
          category: effectiveTxnCategory,
          amount: amt,
        };

        console.log("Creating API Transaction with payload:", payload);

        const apiTxn = await createTransactionApi(payload);

        console.log("API Transaction Created:", apiTxn);

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
      mutationPending.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
      <PageHeading title="Daily Entry" subtitle="Register players and manage their cash-in and cash-out transactions." icon={UserPlus} />
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
          All Players
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
              <th role="columnheader" className="text-center px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Status
              </th>
              <th role="columnheader" className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
              </th>
            </tr>
          </thead>

          <tbody role="rowgroup">
            {displayed.length === 0 ? (
              <tr role="row">
                <td role="cell" data-label=""
                  colSpan={5}
                  className="px-4 py-10 text-center text-muted-foreground text-sm"
                >
                  {search
                    ? "No matching players."
                    : "No players registered. Register one above."}
                </td>
              </tr>
            ) : (
              paginatedPlayers.map((p, i) => {
                const { incoming, outgoing } = getPlayerTotals(p);
                const status = getStatus(incoming, outgoing);

                return (
                  <Fragment key={p.id}>
                    <tr role="row"
                      className={`border-b border-border last:border-0 ${status === "compliance"
                        ? "bg-emerald-500/5"
                        : status === "warning"
                          ? "bg-amber-500/5"
                          : ((safeCurrentPage - 1) * PLAYERS_PER_PAGE + i) % 2 ===
                            1
                            ? "bg-secondary/20"
                            : ""
                        }`}
                    >
                      <td role="cell" data-label="Player" className="px-4 py-3">
                        <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                          <p className="font-semibold">{p.name}</p>
                          {p.gamerNumber && (
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              {p.gamerNumber}
                            </p>
                          )}
                        </div>
                      </td>
                      <td role="cell" data-label="Cash In" className="px-4 py-3 text-right">
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
                      <td role="cell" data-label="Status" className="px-4 py-3 text-center">
                        <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                          <StatusBadge status={status} />
                        </div>
                      </td>
                      <td role="cell" data-label="Actions" className="px-4 py-3 text-right">
                        <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                          <div className="flex flex-wrap justify-end gap-2">

                            <button
                              type="button"
                              onClick={() => openTxn(p)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-xs bg-secondary hover:bg-accent/20 border border-border rounded-sm transition-colors text-foreground"
                            >
                              <Plus size={13} aria-hidden="true" /> Add Transaction
                            </button>

                            {p.transactions.length > 0 && (
                              <button
                                onClick={() => toggleTransactions(p.id)}
                                aria-expanded={expandedPlayers.has(p.id)}
                                aria-controls={`player-transactions-${p.id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs bg-secondary hover:bg-accent/20 border border-border rounded-sm transition-colors text-foreground"
                              >
                                <List size={13} aria-hidden="true" /> View All Transactions
                                {expandedPlayers.has(p.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandedPlayers.has(p.id) &&
                      <tr role="row" data-transactions-row><td role="cell" data-label="" colSpan={5}>
                        <PlayerTransactionsSection player={p} openTxn={openTxn} />
                      </td>
                      </tr>
                    }
                  </Fragment>
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
          nameQuery={nameQuery}
          onNameQueryChange={changeNameQuery}
          onNameLookup={handleNameLookup}
          nameMatches={nameMatches}
          nameSearched={nameSearched}
          onSelectPlayer={selectLookupPlayer}
          selectedPlayer={lookedUpPlayer}
          playerDraft={playerDraft}
          setPlayerDraft={setPlayerDraft}
          resetPlayerDraft={resetPlayerDraft}
          handleAddPlayer={handleAddPlayer}
          saving={saving}
          playerError={playerError}
          setPlayerError={setPlayerError}
          handleGamerNumberLookup={handleGamerNumberLookup}
          playerLookupLoading={playerLookupLoading}
          playerLookupMessage={
            playerLookupMessage === "Player details loaded." &&
              (!lookedUpPlayer ||
                String(lookedUpPlayer.gamerNumber || "").trim().toLowerCase() !==
                playerDraft.gamerNumber.trim().toLowerCase())
              ? ""
              : playerLookupMessage
          }
          setPlayerLookupMessage={setPlayerLookupMessage}
        />
      )}

      {/* Duplicate modal */}
      {dupModal && (
        <DuplicatePlayerModal
          dupModal={dupModal}
          setDupModal={setDupModal}
          openTxn={openTxn}
          createPlayer={() => void createPlayer()}
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
          submitDisabled={isTxnSubmitDisabled}
          hasChanges={hasTransactionChanges}
        />
      )}

    </div>
  );
}
