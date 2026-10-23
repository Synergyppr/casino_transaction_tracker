"use client";
import { formatPhoneNumber } from "../lib/formatPhone";
import EditPlayerModal, { type EditPlayerDraft } from "./modals/EditPlayerModal";
import { updatePlayerApi } from "../lib/api";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pencil,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";

const PLAYERS_PER_PAGE = 15;

export interface RegisteredPlayerTransaction {
  id: string;
  direction: string;
  category: string;
  date: string;
  amount: number;
}

export interface RegisteredPlayer {
  firstName?: string;
  lastName?: string;
  totalTransactions?: number;
  totalCashIn?: number;
  totalCashOut?: number;
  id: string;
  gamerNumber: string;
  name: string;
  phone: string;
  date: string;
  transactions: RegisteredPlayerTransaction[];
  createdBy: string;
  active: boolean;
}

interface RegisteredPlayersApiResponse {
  data?: RegisteredPlayer[];
  message?: string;
  error?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDate(value?: string): string {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: value.includes("T") ? "numeric" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
  }).format(parsed);
}

function normalizeDirection(direction?: string): "incoming" | "outgoing" {
  const normalized = String(direction || "").trim().toLowerCase();

  return normalized === "outgoing" ||
    normalized === "cash out" ||
    normalized === "cashout" ||
    normalized === "out"
    ? "outgoing"
    : "incoming";
}

async function getAllRegisteredPlayers(
  signal?: AbortSignal
): Promise<RegisteredPlayer[]> {
  const response = await fetch(
    "/api/CasinoPlayerTracking/players/get-all-registered",
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
      cache: "no-store",
      signal,
    }
  );

  let payload: RegisteredPlayersApiResponse | RegisteredPlayer[] | null = null;

  try {
    payload = (await response.json()) as
      | RegisteredPlayersApiResponse
      | RegisteredPlayer[];
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const apiPayload = payload as RegisteredPlayersApiResponse | null;

    throw new Error(
      apiPayload?.message ||
      apiPayload?.error ||
      `Failed to load registered players (${response.status}).`
    );
  }

  const players = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  return players.map((player) => ({
    ...player,
    gamerNumber: player.gamerNumber || "",
    name: player.name || "Unknown Player",
    phone: player.phone || "",
    date: player.date || "",
    createdBy: player.createdBy || "",
    active: player.active !== false,
    transactions: Array.isArray(player.transactions)
      ? player.transactions.map((transaction) => ({
        ...transaction,
        direction: transaction.direction || "incoming",
        category: transaction.category || "Other",
        date: transaction.date || "",
        amount: Number(transaction.amount) || 0,
      }))
      : [],
  }));
}

export default function RegisteredPlayersView({ updatedBy }: { updatedBy: string }) {
  const [editDraft, setEditDraft] = useState<EditPlayerDraft | null>(null);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const loadPlayers = useCallback(async (isRefresh = false) => {
    const requestId = ++requestIdRef.current;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const registeredPlayers = await getAllRegisteredPlayers();
      if (mountedRef.current && requestId === requestIdRef.current) setPlayers(registeredPlayers);
    } catch (err) {
      if (mountedRef.current && requestId === requestIdRef.current) setError(err instanceof Error ? err.message : "Failed to load registered players.");
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // React's development mount check cancels this timer before any request starts.
    const timer = setTimeout(() => { void loadPlayers(); }, 0);
    return () => {
      clearTimeout(timer);
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [loadPlayers]);

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return players
      .filter((player) => {
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && player.active) ||
          (statusFilter === "inactive" && !player.active);

        if (!matchesStatus) return false;
        if (!normalizedSearch) return true;

        return [
          player.name,
          player.gamerNumber,
          player.phone,
          player.createdBy,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(normalizedSearch)
        );
      })
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name) ||
          a.gamerNumber.localeCompare(b.gamerNumber)
      );
  }, [players, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPlayers.length / PLAYERS_PER_PAGE)
  );

  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedPlayers = useMemo(() => {
    const start = (safeCurrentPage - 1) * PLAYERS_PER_PAGE;
    return filteredPlayers.slice(start, start + PLAYERS_PER_PAGE);
  }, [filteredPlayers, safeCurrentPage]);

  const summary = useMemo(() => {
    return players.reduce(
      (result, player) => {
        result.totalTransactions += player.totalTransactions ?? player.transactions.length;

        for (const transaction of player.transactions) {
          if (normalizeDirection(transaction.direction) === "outgoing") {
            result.cashOut += transaction.amount;
          } else {
            result.cashIn += transaction.amount;
          }
        }

        return result;
      },
      {
        totalTransactions: 0,
        cashIn: 0,
        cashOut: 0,
      }
    );
  }, [players]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handleStatusChange(value: "all" | "active" | "inactive") {
    setStatusFilter(value);
    setCurrentPage(1);
  }

  function openEditor(player: RegisteredPlayer) {
    const [firstName = "", ...rest] = player.name.trim().split(/\s+/);
    setEditError("");
    setEditDraft({ id: player.id, firstName, lastName: rest.join(" "), gamerNumber: player.gamerNumber, phone: player.phone, active: player.active });
  }

  async function savePlayer() {
    if (!editDraft || saving) return;
    if (!editDraft.firstName.trim() || !editDraft.lastName.trim() || !editDraft.gamerNumber.trim()) { setEditError("First name, last name and player number are required."); return; }
    setSaving(true); setEditError("");
    try {
      await updatePlayerApi({ ...editDraft, firstName: editDraft.firstName.trim(), lastName: editDraft.lastName.trim(), gamerNumber: editDraft.gamerNumber.trim(), phone: editDraft.phone.trim(), updatedBy });
      setPlayers(previous => previous.map(player => player.id === editDraft.id ? { ...player, name: `${editDraft.firstName.trim()} ${editDraft.lastName.trim()}`, gamerNumber: editDraft.gamerNumber.trim(), phone: editDraft.phone.trim(), active: editDraft.active } : player));
      setEditDraft(null);
      await loadPlayers(true);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update player");
    } finally {
      setSaving(false);
    }
  }

  const firstVisible =
    filteredPlayers.length > 0
      ? (safeCurrentPage - 1) * PLAYERS_PER_PAGE + 1
      : 0;
  const lastVisible = Math.min(
    safeCurrentPage * PLAYERS_PER_PAGE,
    filteredPlayers.length
  );

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-5">
      {editDraft && <EditPlayerModal playerDraft={editDraft} setPlayerDraft={setEditDraft} saving={saving} error={editError} setError={setEditError} onClose={() => { if (!saving) setEditDraft(null); }} onSubmit={savePlayer} />}
      <div className="mx-auto w-full space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserRound size={17} className="text-accent" />
              <h1 className="text-lg font-semibold text-foreground">
                Registered Players
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              View every player registered in the casino player-tracking system.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadPlayers(true)}
            disabled={loading || refreshing}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-border bg-secondary px-3 text-sm text-foreground transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard label="Registered" value={String(players.length)} />
          <SummaryCard
            label="Active"
            value={String(players.filter((player) => player.active).length)}
          />
          <SummaryCard
            label="Transactions"
            value={String(summary.totalTransactions)}
          />
          <SummaryCard
            label="Total Volume"
            value={formatCurrency(players.map(player => (player.totalCashIn ?? 0) + (player.totalCashOut ?? 0)).reduce((sum, value) => sum + (value || 0), 0))}
          />
        </div>

        <div className="flex flex-col gap-3 rounded border border-border bg-card p-3 sm:flex-row sm:items-center">
          <div className="flex h-9 w-full items-center gap-2 rounded-sm border border-border bg-secondary px-3 sm:max-w-sm">
            <Search size={13} className="shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search name, gamer #, phone, or creator"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex gap-1 sm:ml-auto">
            {(["all", "active", "inactive"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(status)}
                className={`h-9 rounded-sm border px-3 text-xs font-medium capitalize transition-colors ${statusFilter === status
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded border border-border bg-card">
          <div className="overflow-x-auto">
            <table role="table" data-mobile-stack
              className="w-full lg:min-w-245 text-sm
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
                  <th role="columnheader" className="w-10 px-3 py-2.5 text-xs text-muted-foreground">Edit</th>
                  <th role="columnheader" className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Player
                  </th>
                  <th role="columnheader" className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Phone
                  </th>
                  <th role="columnheader" className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Registered
                  </th>
                  <th role="columnheader" className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Created By
                  </th>
                  <th role="columnheader" className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">
                    Transactions
                  </th>
                  <th role="columnheader" className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Cash In
                  </th>
                  <th role="columnheader" className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Cash Out
                  </th>
                  <th role="columnheader" className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody role="rowgroup">
                {loading ? (
                  <tr role="row">
                    <td role="cell" data-label="" colSpan={9} className="px-4 py-16 text-center">
                      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 size={16} className="animate-spin text-accent" />
                        Loading registered players...
                      </div>
                    </td>
                  </tr>
                ) : paginatedPlayers.length === 0 ? (
                  <tr role="row">
                    <td role="cell" data-label=""
                      colSpan={9}
                      className="px-4 py-16 text-center text-sm text-muted-foreground"
                    >
                      {search || statusFilter !== "all"
                        ? "No registered players match the selected filters."
                        : "No registered players were returned by the API."}
                    </td>
                  </tr>
                ) : (
                  paginatedPlayers.map((player, index) => {

                    const cashIn = player.transactions.reduce(
                      (total, transaction) =>
                        normalizeDirection(transaction.direction) === "incoming"
                          ? total + transaction.amount
                          : total,
                      0
                    );
                    const cashOut = player.transactions.reduce(
                      (total, transaction) =>
                        normalizeDirection(transaction.direction) === "outgoing"
                          ? total + transaction.amount
                          : total,
                      0
                    );

                    return (
                      <PlayerRows
                        key={player.id}
                        player={player}
                        index={index}
                        cashIn={cashIn}
                        cashOut={cashOut}
                        onEdit={() => openEditor(player)}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredPlayers.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {firstVisible}–{lastVisible} of {filteredPlayers.length}{" "}
                players
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={safeCurrentPage === 1}
                  className="inline-flex h-8 items-center gap-1 rounded-sm border border-border bg-secondary px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={13} />
                  Previous
                </button>

                <span className="min-w-20 text-center font-mono text-xs text-muted-foreground">
                  Page {safeCurrentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={safeCurrentPage === totalPages}
                  className="inline-flex h-8 items-center gap-1 rounded-sm border border-border bg-secondary px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-card p-3 sm:p-4">
      <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function PlayerRows({
  player,
  index,
  cashIn,
  cashOut,
  onEdit,
}: {
  player: RegisteredPlayer;
  index: number;
  cashIn: number;
  cashOut: number;
  onEdit: () => void;
}) {
  return (
    <>
      <tr
        role="row"
        className={`border-b border-border ${index % 2 === 1 ? "bg-secondary/15" : ""}`}
      >
        <td role="cell" data-label="Edit" className="px-3 py-3 text-center">
          <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
           max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
           max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
           max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal"
          >
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent/10 
              hover:text-foreground disabled:cursor-default disabled:opacity-30"
              aria-label={`Edit ${player.name}`}
            >
              <Pencil size={14} />
            </button>
          </div>
        </td>

        <td role="cell" data-label="Player" className="px-3 py-3">
          <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
           max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
           max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
           max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal"
          >
            <p className="font-semibold text-foreground">{player.name}</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {player.gamerNumber || "No player number"}
            </p>
          </div>
        </td>

        <td role="cell" data-label="Phone" className="px-3 py-3 text-muted-foreground">
          <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
            max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
            max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
            max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal"
          >
            {formatPhoneNumber(player.phone)}
          </div></td>
        <td role="cell" data-label="Registered" className="px-3 py-3 text-muted-foreground">
          <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
           max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
           max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
           max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal"
          >
            {formatDate(player.date)}
          </div>
        </td>
        <td role="cell" data-label="Created by" className="px-3 py-3 text-muted-foreground">
          <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
           max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
           max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
           max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
            {player.createdBy || "—"}
          </div>
        </td>
        <td role="cell" data-label="Transactions" className="px-3 py-3 text-center font-mono">
          <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
            max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
            max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
            max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
            {player?.totalTransactions}
          </div>
        </td>
        <td role="cell" data-label="Cash In" className="px-3 py-3 text-right font-mono text-emerald-400">
          <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
            max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
            max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
            max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
            {/* {formatCurrency(cashIn)} */}
            {formatCurrency(player.totalCashIn ?? cashIn)}
          </div>
        </td>
        <td role="cell" data-label="Cash Out" className="px-3 py-3 text-right font-mono text-rose-400">
          <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
           max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
           max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
           max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
            {/* {formatCurrency(cashOut)} */}
            {formatCurrency(player.totalCashOut ?? cashOut)}

          </div>
        </td>
        <td role="cell" data-label="Status" className="px-3 py-3 text-center">
          <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
           max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
           max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
           max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal"
          >
            <span
              className={`inline-flex rounded-sm border px-2 py-0.5 font-mono text-[11px] 
                ${player.active
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                  : "border-border bg-secondary text-muted-foreground"
                }`}
            >
              {player.active ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        </td>
      </tr>
    </>
  );
}
