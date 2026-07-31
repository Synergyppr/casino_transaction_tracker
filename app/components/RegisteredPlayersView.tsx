"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
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

export default function RegisteredPlayersView() {
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadPlayers = useCallback(async (isRefresh = false) => {
    const controller = new AbortController();

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const registeredPlayers = await getAllRegisteredPlayers(
        controller.signal
      );
      setPlayers(registeredPlayers);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;

      setError(
        err instanceof Error ? err.message : "Failed to load registered players."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function initialize() {
      setLoading(true);
      setError("");

      try {
        const registeredPlayers = await getAllRegisteredPlayers(
          controller.signal
        );
        setPlayers(registeredPlayers);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load registered players."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void initialize();

    return () => controller.abort();
  }, []);

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
        result.totalTransactions += player.transactions.length;

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

  function toggleExpanded(playerId: string) {
    setExpandedPlayerIds((previous) => {
      const next = new Set(previous);

      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }

      return next;
    });
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
      <div className="mx-auto w-full max-w-7xl space-y-5">
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
            value={formatCurrency(summary.cashIn + summary.cashOut)}
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
                className={`h-9 rounded-sm border px-3 text-xs font-medium capitalize transition-colors ${
                  statusFilter === status
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

        <div className="overflow-hidden rounded border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-245 text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="w-10 px-3 py-2.5" />
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Player
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Phone
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Registered
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Created By
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">
                    Transactions
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Cash In
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Cash Out
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 size={16} className="animate-spin text-accent" />
                        Loading registered players...
                      </div>
                    </td>
                  </tr>
                ) : paginatedPlayers.length === 0 ? (
                  <tr>
                    <td
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
                    const expanded = expandedPlayerIds.has(player.id);
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
                        expanded={expanded}
                        cashIn={cashIn}
                        cashOut={cashOut}
                        onToggle={() => toggleExpanded(player.id)}
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
  expanded,
  cashIn,
  cashOut,
  onToggle,
}: {
  player: RegisteredPlayer;
  index: number;
  expanded: boolean;
  cashIn: number;
  cashOut: number;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`border-b border-border ${
          index % 2 === 1 ? "bg-secondary/15" : ""
        }`}
      >
        <td className="px-3 py-3 text-center">
          <button
            type="button"
            onClick={onToggle}
            disabled={player.transactions.length === 0}
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground disabled:cursor-default disabled:opacity-30"
            aria-label={expanded ? "Collapse transactions" : "Expand transactions"}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </td>

        <td className="px-3 py-3">
          <p className="font-semibold text-foreground">{player.name}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {player.gamerNumber || "No gamer number"}
          </p>
        </td>

        <td className="px-3 py-3 text-muted-foreground">
          {player.phone || "—"}
        </td>
        <td className="px-3 py-3 text-muted-foreground">
          {formatDate(player.date)}
        </td>
        <td className="px-3 py-3 text-muted-foreground">
          {player.createdBy || "—"}
        </td>
        <td className="px-3 py-3 text-center font-mono">
          {player.transactions.length}
        </td>
        <td className="px-3 py-3 text-right font-mono text-emerald-400">
          {formatCurrency(cashIn)}
        </td>
        <td className="px-3 py-3 text-right font-mono text-rose-400">
          {formatCurrency(cashOut)}
        </td>
        <td className="px-3 py-3 text-center">
          <span
            className={`inline-flex rounded-sm border px-2 py-0.5 font-mono text-[11px] ${
              player.active
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            {player.active ? "ACTIVE" : "INACTIVE"}
          </span>
        </td>
      </tr>

      {expanded && player.transactions.length > 0 && (
        <tr className="border-b border-border bg-secondary/25">
          <td colSpan={9} className="px-5 py-4">
            <div className="overflow-hidden rounded-sm border border-border bg-background/50">
              <table className="w-full min-w-175 text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Direction
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {player.transactions.map((transaction) => {
                    const direction = normalizeDirection(transaction.direction);

                    return (
                      <tr
                        key={transaction.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`capitalize ${
                              direction === "incoming"
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {direction === "incoming" ? "Cash In" : "Cash Out"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-foreground">
                          {transaction.category}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground">
                          {formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
