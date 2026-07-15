"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Download,
  Loader2,
  Eye,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Search,
  FilterX,
} from "lucide-react";

import type { Player, ApiPlayer, ApiDailyReport, Cashier } from "../lib/types";
import {
  COMPLIANCE_THRESHOLD,
  TODAY,
  WARNING_THRESHOLD,
} from "../lib/constants";
import { getPlayerTotals, getStatus, fmt, fmtDate } from "../lib/utils";
import { getDailyReport, getTransactionLogs } from "../lib/api";

import { Modal } from "./Modal";
import { exportTransactionsToCsv } from "../helpers/exportCsv";

export type TransactionLog = {
  id: string;
  transactionId: string;
  action: string;
  oldValuesJson: unknown;
  newValuesJson: unknown;
  reason: string;
  changedByCashierId: string;
  createdAtUtc: string;
};

export type TransactionRow = {
  id: string;
  direction: "incoming" | "outgoing";
  category: string;
  amount: number;
  timestamp: string;
  cashierId: string;
  cashierName?: string;
  player: Player;
  playerId: string;
  playerName: string;
  gamerNumber?: string;
  date: string;
  time: string;
};

type SortKey = "dateTime" | "player" | "direction" | "category" | "amount";
type SortDirection = "asc" | "desc";
type DirectionFilter = "all" | "incoming" | "outgoing";
type AlertFilter = "all" | "normal" | "warning" | "compliance";

type ParsedLogValues = {
  direction?: "incoming" | "outgoing";
  amount?: number;
  category?: string;
  status?: string;
  [key: string]: unknown;
};

function safeParseJson(value: unknown): ParsedLogValues {
  if (value === null || value === undefined || value === "") return {};

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as ParsedLogValues;
  }

  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as ParsedLogValues)
      : {};
  } catch {
    return {};
  }
}

function normalizeJsonValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) return value.map(normalizeJsonValue);

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeJsonValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

function areJsonValuesEqual(oldValue: unknown, newValue: unknown) {
  return (
    JSON.stringify(normalizeJsonValue(oldValue)) ===
    JSON.stringify(normalizeJsonValue(newValue))
  );
}

function getChangedLogValues(oldValuesJson: unknown, newValuesJson: unknown) {
  const oldValues = safeParseJson(oldValuesJson);
  const newValues = safeParseJson(newValuesJson);
  const keys = Array.from(
    new Set([...Object.keys(oldValues), ...Object.keys(newValues)])
  );

  return keys.reduce(
    (acc, key) => {
      if (!areJsonValuesEqual(oldValues[key], newValues[key])) {
        if (Object.prototype.hasOwnProperty.call(oldValues, key)) {
          acc.oldValues[key] = oldValues[key];
        }

        if (Object.prototype.hasOwnProperty.call(newValues, key)) {
          acc.newValues[key] = newValues[key];
        }
      }

      return acc;
    },
    {
      oldValues: {} as ParsedLogValues,
      newValues: {} as ParsedLogValues,
    }
  );
}

function formatChangedLogValues(values: ParsedLogValues) {
  return Object.keys(values).length > 0 ? JSON.stringify(values, null, 2) : "—";
}

function normalizeTransactionLogsResponse(response: unknown): TransactionLog[] {
  if (Array.isArray(response)) return response as TransactionLog[];

  if (response && typeof response === "object") {
    const data = response as {
      logs?: unknown;
      data?: unknown;
      items?: unknown;
      result?: unknown;
    };

    if (Array.isArray(data.logs)) return data.logs as TransactionLog[];
    if (Array.isArray(data.data)) return data.data as TransactionLog[];
    if (Array.isArray(data.items)) return data.items as TransactionLog[];
    if (Array.isArray(data.result)) return data.result as TransactionLog[];
  }

  return [];
}

function formatLogDateTime(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const formatDateOnly = (date?: string) => {
  if (!date) return "";

  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace(",", "");
};

function getDateOnly(value?: string) {
  if (!value) return "";

  const normalized = String(value).trim();

  // ISO/API date: 2026-07-14 or 2026-07-14T00:00:00
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // API display date: 07/14/2026 10:57 PM
  const usMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return normalized;
}

function getTimeOnly(value?: string) {
  if (!value) return "—";

  const normalized = String(value).trim();

  // Preserve the exact local/business time supplied by the API instead of
  // letting Date reinterpret a timezone-less value.
  const twelveHourMatch = normalized.match(
    /(?:^|\s)(\d{1,2}):(\d{2})(?:\s*)(AM|PM)$/i
  );

  if (twelveHourMatch) {
    const [, hour, minute, period] = twelveHourMatch;
    return `${hour.padStart(2, "0")}:${minute} ${period.toUpperCase()}`;
  }

  const twentyFourHourMatch = normalized.match(/(?:T|\s)(\d{2}):(\d{2})/);
  if (twentyFourHourMatch) {
    const hour24 = Number(twentyFourHourMatch[1]);
    const minute = twentyFourHourMatch[2];
    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;

    return `${String(hour12).padStart(2, "0")}:${minute} ${period}`;
  }

  return "—";
}

function getSortableDateTime(dateValue?: string, timeValue?: string) {
  const date = getDateOnly(dateValue);

  if (!date) return 0;

  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!dateMatch) return 0;

  const [, year, month, day] = dateMatch;
  const normalizedTime = String(timeValue || "").trim();

  let hour24 = 0;
  let minute = 0;

  const twelveHourMatch = normalizedTime.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (twelveHourMatch) {
    const hour12 = Number(twelveHourMatch[1]);
    minute = Number(twelveHourMatch[2]);
    const period = twelveHourMatch[3].toUpperCase();

    hour24 = hour12 % 12;

    if (period == "PM") {
      hour24 += 12;
    }
  } else {
    const twentyFourHourMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})/);

    if (twentyFourHourMatch) {
      hour24 = Number(twentyFourHourMatch[1]);
      minute = Number(twentyFourHourMatch[2]);
    }
  }

  return Date.UTC(Number(year), Number(month) - 1, Number(day), hour24, minute);
}

function normalizeApiPlayerToPlayer(apiPlayer: ApiPlayer): Player {
  // console.log("Normalizing API player:", apiPlayer);

  return {
    id: apiPlayer.id,
    name: apiPlayer.name || "Unknown",
    gamerNumber: apiPlayer.gamerNumber,
    date: getDateOnly(apiPlayer.date),
    createdBy: apiPlayer.createdBy || "",
    transactions:
      apiPlayer?.transactions?.map((t) => {
        const tx = t as typeof t & {
          timestamp?: string;
          createdAtUtc?: string;
          createdByCashierId?: string;
          cashierId?: string;
          cashierName?: string;
        };

        return {
          id: tx.id,
          direction:
            tx.direction === "outgoing"
              ? ("outgoing" as const)
              : ("incoming" as const),
          category: tx.category || "Other",
          amount: Number(tx.amount) || 0,
          timestamp: tx.timestamp || tx.createdAtUtc || apiPlayer.date || "",
          cashierId: tx.cashierId || tx.createdByCashierId || "",
          cashierName: tx.cashierName,
          // gamerNumber: apiPlayer.gamerNumber,
        };
      }) || [],
  };
}

export function ReportsView({
  selectedDate,
  apiPlayers,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  cashiers = [],
}: {
  selectedDate: string;
  apiPlayers: ApiPlayer[];
  startDate: string;
  endDate: string;
  setStartDate: (d: string) => void;
  setEndDate: (d: string) => void;
  cashiers?: Cashier[];
}) {
  const [, setReportData] = useState<ApiDailyReport | null>(null);
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([]);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionRow | null>(null);
  const [loadingTransactionLogs, setLoadingTransactionLogs] = useState(false);
  const [reportPlayers, setReportPlayers] = useState<Player[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("dateTime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [directionFilter, setDirectionFilter] =
    useState<DirectionFilter>("all");
  const [alertFilter, setAlertFilter] = useState<AlertFilter>("all");

  const fetchReport = useCallback(async () => {
    setLoadingReport(true);

    try {
      const report = await getDailyReport(
        `${startDate}T00:00:00`,
        `${endDate}T23:59:59.999`
      );
      setReportData(report);

      const playerDetail = Array.isArray(report?.playerDetail)
        ? report.playerDetail
        : [];

      if (playerDetail.length > 0) {
        const built: Player[] = playerDetail.map((pd) => {
          const detail = pd as typeof pd & {
            player?: string;
            playerName?: string;
          };

          const firstTransaction = detail.transactions?.find((transaction) => {
            const candidate = transaction as typeof transaction & {
              date?: string;
              timestamp?: string;
              createdAtUtc?: string;
            };

            return Boolean(
              candidate.date || candidate.timestamp || candidate.createdAtUtc
            );
          }) as
            | ((typeof detail.transactions)[number] & {
                date?: string;
                timestamp?: string;
                createdAtUtc?: string;
              })
            | undefined;

          const firstTransactionDate = getDateOnly(
            firstTransaction?.date ||
              firstTransaction?.timestamp ||
              firstTransaction?.createdAtUtc
          );

          return {
            id: detail.playerId,
            // gamerNumber: playerDetail?.gamerNumber,
            name: detail.playerName || detail.player || "Unknown",
            date: firstTransactionDate,
            transactions:
              detail.transactions?.map((t) => {
                const tx = t as typeof t & {
                  date?: string;
                  timestamp?: string;
                  createdAtUtc?: string;
                  createdByCashierId?: string;
                  cashierName?: string;
                };

                return {
                  id: tx.id,
                  direction:
                    tx.direction === "outgoing"
                      ? ("outgoing" as const)
                      : ("incoming" as const),
                  date: getDateOnly(tx.date || tx.timestamp || tx.createdAtUtc),
                  category: tx.category || "Other",
                  amount: Number(tx.amount) || 0,
                  timestamp: tx.date || tx.timestamp || tx.createdAtUtc || "",
                  cashierId: tx.createdByCashierId || "",
                  cashierName: tx.cashierName,
                };
              }) || [],
            createdBy: "",
          };
        });

        setReportPlayers(built);
      } else {
        setReportPlayers([]);
      }
    } catch (err) {
      console.error("Failed to load report:", err);
      setReportPlayers([]);
    } finally {
      setLoadingReport(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const fetchData = async () => {
      await fetchReport();
    };

    fetchData();
  }, [fetchReport]);

  function openTransactionDetails(transaction: TransactionRow) {
    setTransactionLogs([]);
    setLoadingTransactionLogs(true);
    setSelectedTransaction(transaction);
  }

  function closeTransactionDetails() {
    setSelectedTransaction(null);
    setTransactionLogs([]);
    setLoadingTransactionLogs(false);
  }

  // Now fetch the transaction logs by transaction ID
  useEffect(() => {
    if (!selectedTransaction) return;

    let cancelled = false;

    const fetchLogs = async () => {
      try {
        const logs = await getTransactionLogs(selectedTransaction.id);
        const normalizedLogs = normalizeTransactionLogsResponse(logs);

        if (cancelled) return;

        setTransactionLogs(normalizedLogs);
        console.log(
          "Fetched logs for transaction:",
          selectedTransaction.id,
          normalizedLogs
        );
      } catch (err) {
        if (cancelled) return;

        console.error("Failed to fetch transaction logs:", err);
        setTransactionLogs([]);
      } finally {
        if (!cancelled) {
          setLoadingTransactionLogs(false);
        }
      }
    };

    void fetchLogs();

    return () => {
      cancelled = true;
    };
  }, [selectedTransaction]);

  const normalizedApiPlayers = useMemo(
    () =>
      apiPlayers
        .filter((p) => {
          const [datePart] = (p.date || "").split(" ");
          const [month, day, year] = datePart.split("/");

          const formattedDate =
            month && day && year
              ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
              : getDateOnly(p.date);

          return formattedDate === selectedDate;
        })
        .map(normalizeApiPlayerToPlayer),
    [apiPlayers, selectedDate]
  );

  const datePlayers =
    reportPlayers.length > 0 ? reportPlayers : normalizedApiPlayers;

  const transactionRows = useMemo(
    () =>
      datePlayers
        .flatMap((p) =>
          (p.transactions || []).map((t) => {
            const transaction = t as typeof t & {
              date?: string;
              timestamp?: string;
              createdAtUtc?: string;
            };

            const transactionDateTime =
              transaction.timestamp ||
              transaction.createdAtUtc ||
              transaction.date ||
              p.date;

            return {
              ...t,
              player: p,
              playerId: p.id,
              playerName: p.name,
              gamerNumber: p.gamerNumber,
              date: getDateOnly(
                transaction.date || transactionDateTime || p.date
              ),
              time: getTimeOnly(transactionDateTime),
              cashierName:
                "cashierName" in t && t.cashierName
                  ? String(t.cashierName)
                  : p.createdBy || "Unknown",
            };
          })
        )
        .sort(
          (a, b) =>
            getSortableDateTime(b.date, b.time) -
            getSortableDateTime(a.date, a.time)
        ),
    [datePlayers]
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          transactionRows.map((transaction) => transaction.category || "Other")
        )
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [transactionRows]
  );

  const filteredTransactionRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return transactionRows.filter((transaction) => {
      const transactionAmount = Number(transaction.amount) || 0;

      const transactionAlertStatus: Exclude<AlertFilter, "all"> =
        transactionAmount >= COMPLIANCE_THRESHOLD
          ? "compliance"
          : transactionAmount >= WARNING_THRESHOLD
          ? "warning"
          : "normal";

      const matchesSearch =
        !query ||
        [
          transaction.id,
          transaction.playerName,
          transaction.gamerNumber,
          transaction.direction,
          transaction.direction === "incoming" ? "in" : "out",
          transaction.category,
          transactionAmount,
          transaction.date,
          formatDateOnly(transaction.date),
          transaction.time,
          transaction.cashierName,
          transactionAlertStatus,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query)
        );

      const matchesCategory =
        categoryFilter === "all" ||
        (transaction.category || "Other") === categoryFilter;

      const matchesDirection =
        directionFilter === "all" || transaction.direction === directionFilter;

      const matchesAlert =
        alertFilter === "all" || transactionAlertStatus === alertFilter;

      return (
        matchesSearch && matchesCategory && matchesDirection && matchesAlert
      );
    });
  }, [
    transactionRows,
    searchQuery,
    categoryFilter,
    directionFilter,
    alertFilter,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    categoryFilter !== "all" ||
    directionFilter !== "all" ||
    alertFilter !== "all";

  function clearAdvancedFilters() {
    setSearchQuery("");
    setCategoryFilter("all");
    setDirectionFilter("all");
    setAlertFilter("all");
    setCurrentPage(1);
  }

  const sortedTransactionRows = useMemo(() => {
    const rows = [...filteredTransactionRows];

    rows.sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case "player":
          comparison = a.playerName.localeCompare(b.playerName, undefined, {
            sensitivity: "base",
          });
          break;

        case "direction":
          comparison = a.direction.localeCompare(b.direction);
          break;

        case "category":
          comparison = (a.category || "Other").localeCompare(
            b.category || "Other",
            undefined,
            {
              sensitivity: "base",
            }
          );
          break;

        case "amount":
          comparison = (Number(a.amount) || 0) - (Number(b.amount) || 0);
          break;

        case "dateTime":
        default:
          comparison =
            getSortableDateTime(a.date, a.time) -
            getSortableDateTime(b.date, b.time);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return rows;
  }, [filteredTransactionRows, sortKey, sortDirection]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedTransactionRows.length / pageSize)
  );

  /*
   * Do not update currentPage inside an effect.
   *
   * currentPage may temporarily be greater than totalPages after filtering.
   * safeCurrentPage derives a valid page without causing another render.
   */
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedTransactionRows = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;

    return sortedTransactionRows.slice(startIndex, startIndex + pageSize);
  }, [sortedTransactionRows, safeCurrentPage, pageSize]);

  function handleSort(key: SortKey) {
    setCurrentPage(1);

    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "dateTime" ? "desc" : "asc");
  }

  function renderSortIcon(key: SortKey) {
    if (sortKey !== key) {
      return <ArrowUpDown size={12} className="opacity-50" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUp size={12} />
    ) : (
      <ArrowDown size={12} />
    );
  }

  const selectedTransactionLogs = useMemo(() => {
    if (!selectedTransaction) return [];

    const matchingLogs = (transactionLogs as TransactionLog[])
      .filter(
        (log) =>
          !log.transactionId || log.transactionId === selectedTransaction.id
      )
      .map((log) => ({
        ...log,
        transactionId: log.transactionId || selectedTransaction.id,
      }))
      .sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc));

    return matchingLogs;
  }, [selectedTransaction, transactionLogs]);

  const selectedTransactionTotals = selectedTransaction
    ? {
        incoming:
          selectedTransaction.direction === "incoming"
            ? Number(selectedTransaction.amount) || 0
            : 0,
        outgoing:
          selectedTransaction.direction === "outgoing"
            ? Number(selectedTransaction.amount) || 0
            : 0,
      }
    : { incoming: 0, outgoing: 0 };

  const totals = transactionRows.reduce(
    (acc, t) => {
      const amount = Number(t.amount) || 0;

      return {
        incoming: acc.incoming + (t.direction === "incoming" ? amount : 0),
        outgoing: acc.outgoing + (t.direction === "outgoing" ? amount : 0),
        txns: acc.txns + 1,
      };
    },
    { incoming: 0, outgoing: 0, txns: 0 }
  );

  const complianceCount = datePlayers.filter((p) => {
    const { incoming, outgoing } = getPlayerTotals(p);
    return getStatus(incoming, outgoing) === "compliance";
  }).length;

  return (
    <div className="p-5 space-y-5 overflow-auto">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-muted-foreground" />
          <input
            type="date"
            value={startDate}
            max={TODAY}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
          />
          {loadingReport && (
            <Loader2 size={14} className="animate-spin text-accent" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-muted-foreground" />
          <input
            type="date"
            value={endDate}
            max={TODAY}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
          />
          {loadingReport && (
            <Loader2 size={14} className="animate-spin text-accent" />
          )}
        </div>

        <button
          onClick={() => exportTransactionsToCsv(transactionRows, selectedDate)}
          disabled={transactionRows.length === 0}
          className="flex items-center gap-2 px-4 h-9 bg-secondary border border-border rounded-sm text-sm text-muted-foreground hover:text-foreground 
          transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Download size={12} />
          Export CSV
        </button>
      </div>

      {/* Summary */}
      <div>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-3">
          {fmtDate(selectedDate)}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Players", value: String(datePlayers?.length) },
            { label: "Transactions", value: String(totals?.txns) },
            {
              label: "Total Cash In",
              value: fmt(totals?.incoming),
              mono: true,
            },
            {
              label: "Compliance Alerts",
              value: String(complianceCount),
              highlight: complianceCount > 0,
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-card border rounded p-4 ${
                s.highlight ? "border-emerald-500/25" : "border-border"
              }`}
            >
              <p className="text-xs text-muted-foreground mb-1.5 font-mono uppercase tracking-wider">
                {s.label}
              </p>
              <p
                className={`text-2xl font-semibold ${
                  s.mono ? "font-mono" : ""
                } ${s.highlight ? "text-emerald-400" : "text-foreground"}`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Detail table */}
      <div>
        <div className="mb-3 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Transaction Detail
            </p>

            <div className="relative w-full sm:max-w-xs">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                aria-label="Search transactions"
                className="h-9 w-full rounded-sm border border-border bg-secondary pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Category
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter transactions by category"
                className="h-9 w-full rounded-sm border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              >
                <option value="all">All Categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Direction
              </span>
              <select
                value={directionFilter}
                onChange={(e) =>
                  setDirectionFilter(e.target.value as DirectionFilter)
                }
                aria-label="Filter transactions by direction"
                className="h-9 w-full rounded-sm border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              >
                <option value="all">All Directions</option>
                <option value="incoming">Cash In</option>
                <option value="outgoing">Cash Out</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Alerts
              </span>
              <select
                value={alertFilter}
                onChange={(e) => setAlertFilter(e.target.value as AlertFilter)}
                aria-label="Filter transactions by player alert status"
                className="h-9 w-full rounded-sm border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              >
                <option value="all">All Alert Levels</option>
                <option value="normal">No Alert</option>
                <option value="warning">Warning</option>
                <option value="compliance">Compliance</option>
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearAdvancedFilters}
                disabled={!hasActiveFilters}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-sm border border-border bg-secondary px-3 text-xs text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto cursor-pointer"
              >
                <FilterX size={13} />
                Clear Filters
              </button>
            </div>
          </div>

          {hasActiveFilters && (
            <p className="text-[11px] text-muted-foreground font-mono">
              {filteredTransactionRows.length} of {transactionRows.length}{" "}
              transactions match the active filters.
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("dateTime")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Date & Time
                    {renderSortIcon("dateTime")}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("player")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Player
                    {renderSortIcon("player")}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("direction")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Dir.
                    {renderSortIcon("direction")}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("category")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Category
                    {renderSortIcon("category")}
                  </button>
                </th>
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("amount")}
                    className="ml-auto inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Amount
                    {renderSortIcon("amount")}
                  </button>
                </th>
                {/* <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Cashier
                </th> */}
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Details
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedTransactionRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-muted-foreground text-sm"
                  >
                    {loadingReport
                      ? "Loading..."
                      : hasActiveFilters
                      ? "No transactions match the active filters."
                      : "No transactions for this date."}
                  </td>
                </tr>
              ) : (
                paginatedTransactionRows.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`border-b border-border last:border-0 ${
                      ((currentPage - 1) * pageSize + i) % 2 === 1
                        ? "bg-secondary/20"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {formatDateOnly(t.date)} {t.time}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold">{t.playerName}</p>
                      {t.gamerNumber && (
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {t.gamerNumber}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-sm font-mono ${
                          t.direction === "incoming"
                            ? "bg-sky-500/10 text-sky-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {t.direction === "incoming" ? "IN" : "OUT"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {t.category || "Other"}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-xs text-foreground">
                      {fmt(Number(t.amount) || 0)}
                    </td>

                    {/* <td className="px-4 py-3 text-xs text-muted-foreground">
                      {t.cashierName}
                    </td> */}

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openTransactionDetails(t)}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground 
                        transition-colors hover:text-foreground hover:bg-accent/10 cursor-pointer"
                      >
                        <Eye size={12} />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {transactionRows?.length > 0 && (
              <tfoot>
                <tr className="border-t border-border bg-secondary/40">
                  <td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                    Totals
                  </td>
                  <td />
                  <td />
                  <td />
                  <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-foreground">
                    In {fmt(totals.incoming)} / Out {fmt(totals.outgoing)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {totals.txns} txns
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {sortedTransactionRows.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-x border-b border-border rounded-b bg-card px-4 py-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                Showing {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, sortedTransactionRows.length)}{" "}
                of {sortedTransactionRows.length}
              </span>

              <label className="flex items-center gap-2">
                Rows
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-8 rounded-sm border border-border bg-secondary px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-8 items-center gap-1 rounded-sm border border-border bg-secondary px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={13} />
                Previous
              </button>

              <span className="min-w-20 text-center text-xs text-muted-foreground font-mono">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
                className="inline-flex h-8 items-center gap-1 rounded-sm border border-border bg-secondary px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                Next
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedTransaction && (
        <Modal onClose={closeTransactionDetails}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold">Transaction Log Details</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedTransaction.playerName}
                {selectedTransaction.gamerNumber
                  ? ` • ${selectedTransaction.gamerNumber}`
                  : ""}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono mt-1">
                Transaction ID: {selectedTransaction.id}
              </p>
            </div>

            <button
              onClick={closeTransactionDetails}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="rounded-sm border border-border bg-secondary/40 p-3">
              <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-1">
                Cash In
              </p>
              <p className="text-sm font-mono font-semibold text-foreground">
                {fmt(selectedTransactionTotals.incoming)}
              </p>
            </div>

            <div className="rounded-sm border border-border bg-secondary/40 p-3">
              <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-1">
                Cash Out
              </p>
              <p className="text-sm font-mono font-semibold text-foreground">
                {fmt(selectedTransactionTotals.outgoing)}
              </p>
            </div>

            <div className="rounded-sm border border-border bg-secondary/40 p-3">
              <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-1">
                Logs
              </p>
              <p className="text-sm font-mono font-semibold text-foreground">
                {selectedTransactionLogs.length}
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-[65vh] overflow-auto pr-1">
            {loadingTransactionLogs ? (
              <div className="rounded-sm border border-border bg-secondary/30 px-4 py-8 text-center text-sm text-muted-foreground">
                <Loader2
                  size={15}
                  className="mx-auto mb-2 animate-spin text-accent"
                />
                Loading transaction logs...
              </div>
            ) : selectedTransactionLogs.length === 0 ? (
              <div className="rounded-sm border border-border bg-secondary/30 px-4 py-8 text-center text-sm text-muted-foreground">
                No logs found for this transaction.
              </div>
            ) : (
              selectedTransactionLogs.map((log) => {
                const changedValues = getChangedLogValues(
                  log.oldValuesJson,
                  log.newValuesJson
                );
                const values = changedValues.newValues;
                const changedBy =
                  cashiers.find((c) => c.id === log.changedByCashierId)?.name ??
                  log.changedByCashierId ??
                  "Unknown";

                return (
                  <div
                    key={log.id}
                    className="rounded border border-border bg-card overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border bg-secondary/30 px-3 py-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-sm bg-accent/10 px-1.5 py-0.5 text-xs font-mono text-accent">
                          {log.action}
                        </span>

                        {values.direction && (
                          <span
                            className={`rounded-sm px-1.5 py-0.5 text-xs font-mono ${
                              values.direction === "incoming"
                                ? "bg-sky-500/10 text-sky-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {values.direction === "incoming" ? "IN" : "OUT"}
                          </span>
                        )}

                        {typeof values.amount === "number" && (
                          <span className="text-xs font-mono text-foreground">
                            {fmt(values.amount)}
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-muted-foreground font-mono">
                        {formatLogDateTime(log.createdAtUtc)}
                      </span>
                    </div>

                    <div className="p-3 space-y-3">
                      <div>
                        <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-1">
                          Reason
                        </p>
                        <p className="text-xs text-foreground">
                          {log.reason || "—"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-1">
                            Old Values
                          </p>
                          <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-sm bg-secondary/60 border border-border p-2 text-[11px] leading-relaxed text-muted-foreground font-mono">
                            {formatChangedLogValues(changedValues?.oldValues)}
                          </pre>
                        </div>

                        <div>
                          <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-1">
                            New Values
                          </p>
                          <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-sm bg-secondary/60 border border-border p-2 text-[11px] leading-relaxed text-muted-foreground font-mono">
                            {formatChangedLogValues(changedValues?.newValues)}
                          </pre>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <p className="text-xs text-muted-foreground">
                          Changed by{" "}
                          <span className="text-foreground">{changedBy}</span>
                        </p>

                        {values.category && (
                          <p className="text-xs text-muted-foreground">
                            {values.category}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
