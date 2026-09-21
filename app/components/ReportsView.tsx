"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  Calendar,
  Download,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import type { Player, ApiPlayer } from "../lib/types";
import {
  COMPLIANCE_THRESHOLD,
  TODAY,
  WARNING_THRESHOLD,
} from "../lib/constants";
import { getPlayerTotals, getStatus, fmt, fmtDate } from "../lib/utils";
import { getDailyReport, getTransactionLogs } from "../lib/api";

import { exportTransactionsToCsv } from "../helpers/exportCsv";
import type { ReportData } from "../reports/page";
import SelectedTransactionModal from "./modals/SelectedTransactionModal";
import ReportsViewTable from "./ReportsViewTable";

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
  cashierId: string;
  cashierName?: string;
  player: Player;
  playerId: string;
  playerName: string;
  gamerNumber?: string;
  date: string;
  time: string;
};

export type SortKey =
  | "dateTime"
  | "player"
  | "direction"
  | "category"
  | "amount";
export type SortDirection = "asc" | "desc";
export type DirectionFilter = "all" | "incoming" | "outgoing";
export type AlertFilter = "all" | "normal" | "warning" | "compliance";

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

export function getChangedLogValues(
  oldValuesJson: unknown,
  newValuesJson: unknown
) {
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

const LOG_FIELD_LABELS: Record<string, string> = {
  direction: "Direction",
  amount: "Amount",
  category: "Category",
  status: "Status",
  date: "Date",
  time: "Time",
  playerId: "Player",
  cashierId: "Cashier",
  createdByCashierId: "Created By",
  updatedByCashierId: "Updated By",
};

function formatLogFieldName(key: string) {
  if (LOG_FIELD_LABELS[key]) return LOG_FIELD_LABELS[key];

  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatLogValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "Empty";

  if (key === "amount") {
    const amount = Number(value);
    return Number.isFinite(amount) ? fmt(amount) : String(value);
  }

  if (key === "direction") {
    if (value === "incoming") return "Cash In";
    if (value === "outgoing") return "Cash Out";
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map((item) => String(item)).join(", ")
      : "Empty";
  }

  if (typeof value === "object") return JSON.stringify(value, null, 2);

  return String(value);
}

export function getChangedFieldRows(
  oldValues: ParsedLogValues,
  newValues: ParsedLogValues
) {
  const keys = Array.from(
    new Set([...Object.keys(oldValues), ...Object.keys(newValues)])
  );

  return keys.map((key) => ({
    key,
    label: formatLogFieldName(key),
    oldValue: oldValues[key],
    newValue: newValues[key],
    hasOldValue: Object.prototype.hasOwnProperty.call(oldValues, key),
    hasNewValue: Object.prototype.hasOwnProperty.call(newValues, key),
  }));
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

export function formatLogDateTime(value: string) {
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

export const formatDateOnly = (date?: string) => {
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
          date?: string;
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
          date: tx.date || tx.createdAtUtc || apiPlayer.date || "",
          cashierId: tx.cashierId || tx.createdByCashierId || "",
          cashierName: tx.cashierName,
          // gamerNumber: apiPlayer.gamerNumber,
        };
      }) || [],
  };
}

export function ReportsView({
  selectedDate,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  report,
  setReport,
  cashiers,
}: {
  selectedDate: string;
  startDate: string;
  endDate: string;
  setStartDate: (d: string) => void;
  setEndDate: (d: string) => void;
  report?: ReportData;
  setReport: Dispatch<SetStateAction<ReportData | undefined>>;
  cashiers?: { id: string; name: string }[];
}) {
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
  const [amountMinFilter, setAmountMinFilter] = useState<number | null>(null);
  const [amountMaxFilter, setAmountMaxFilter] = useState<number | null>(null);

  const fetchReport = useCallback(async () => {
    setLoadingReport(true);

    try {
      const propertyId = JSON.parse(
        sessionStorage.getItem("casino_selected_property") || "null"
      )?.id;

      const payload = {
        propertyId: propertyId,
        startDateTime: `${startDate}T00:00:00`,
        endDateTime: `${endDate}T23:59:59.999`,
      };

      const report = await getDailyReport(payload);

      // console.log("Fetched report:", report);
      setReport(report as unknown as ReportData);

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
              createdAtUtc?: string;
            };

            return Boolean(candidate.date || candidate.createdAtUtc);
          }) as
            | ((typeof detail.transactions)[number] & {
              date?: string;
              createdAtUtc?: string;
            })
            | undefined;

          const firstTransactionDate = getDateOnly(
            firstTransaction?.date || firstTransaction?.createdAtUtc
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
                  date: getDateOnly(tx.date || tx.createdAtUtc),
                  category: tx.category || "Other",
                  amount: Number(tx.amount) || 0,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // console.log(
        //   "Fetched logs for transaction:",
        //   selectedTransaction.id,
        //   normalizedLogs
        // );
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

  const normalizedApiPlayers = useMemo<Player[]>(
    () =>
      reportPlayers
        .filter((p) => {
          const [datePart] = (p.date || "").split(" ");
          const [month, day, year] = datePart.split("/");

          const formattedDate =
            month && day && year
              ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
              : getDateOnly(p.date);

          return formattedDate === selectedDate;
        })
        .map((player) => normalizeApiPlayerToPlayer(player as unknown as ApiPlayer)),
    [reportPlayers, selectedDate]
  );

  const datePlayers =
    reportPlayers.length > 0 ? reportPlayers : normalizedApiPlayers;

  const transactionRows = useMemo<TransactionRow[]>(
    () =>
      datePlayers
        .flatMap((p) =>
          (p.transactions || []).map((t): TransactionRow => {
            const transaction = t as typeof t & {
              date?: string;
              createdAtUtc?: string;
            };

            const transactionDateTime =
              transaction.createdAtUtc || transaction.date || p.date;

            return {
              id: t.id,
              direction: t.direction,
              category: t.category || "Other",
              amount: Number(t.amount) || 0,
              cashierId: t.cashierId || "",
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
          transactionRows
            .filter(
              (transaction) =>
                directionFilter === "all" ||
                transaction.direction === directionFilter
            )
            .map((transaction) => transaction.category || "Other")
        )
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [transactionRows, directionFilter]
  );

  const amountBounds = useMemo(() => {
    if (transactionRows.length === 0) {
      return { min: 0, max: 50 };
    }

    const amounts = transactionRows
      .map((transaction) => Number(transaction.amount) || 0)
      .filter((amount) => Number.isFinite(amount));

    if (amounts.length === 0) {
      return { min: 0, max: 50 };
    }

    const rawMin = Math.min(...amounts);
    const rawMax = Math.max(...amounts);

    const min = Math.floor(rawMin / 50) * 50;
    const roundedMax = Math.ceil(rawMax / 50) * 50;
    const max = roundedMax <= min ? min + 50 : roundedMax;

    return { min, max };
  }, [transactionRows]);

  const effectiveAmountMin = Math.min(
    Math.max(amountMinFilter ?? amountBounds.min, amountBounds.min),
    amountBounds.max
  );

  const effectiveAmountMax = Math.max(
    Math.min(amountMaxFilter ?? amountBounds.max, amountBounds.max),
    amountBounds.min
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

      const matchesAmount =
        transactionAmount >= effectiveAmountMin &&
        transactionAmount <= effectiveAmountMax;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesDirection &&
        matchesAlert &&
        matchesAmount
      );
    });
  }, [
    transactionRows,
    searchQuery,
    categoryFilter,
    directionFilter,
    alertFilter,
    effectiveAmountMin,
    effectiveAmountMax,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    categoryFilter !== "all" ||
    directionFilter !== "all" ||
    alertFilter !== "all" ||
    amountMinFilter !== null ||
    amountMaxFilter !== null;

  function clearAdvancedFilters() {
    setSearchQuery("");
    setCategoryFilter("all");
    setDirectionFilter("all");
    setAlertFilter("all");
    setAmountMinFilter(null);
    setAmountMaxFilter(null);
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
              className={`bg-card border rounded p-4 ${s.highlight ? "border-emerald-500/25" : "border-border"
                }`}
            >
              <p className="text-xs text-muted-foreground mb-1.5 font-mono uppercase tracking-wider">
                {s.label}
              </p>
              <p
                className={`text-2xl font-semibold ${s.mono ? "font-mono" : ""
                  } ${s.highlight ? "text-emerald-400" : "text-foreground"}`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Detail table */}
      <ReportsViewTable
        transactionRows={transactionRows}
        filteredTransactionRows={filteredTransactionRows}
        paginatedTransactionRows={paginatedTransactionRows}
        totals={totals}
        categoryOptions={categoryOptions}
        searchQuery={searchQuery}
        setSearchQuery={(value) => {
          setSearchQuery(value);
          setCurrentPage(1);
        }}
        categoryFilter={categoryFilter}
        setCategoryFilter={(value) => {
          setCategoryFilter(value);
          setCurrentPage(1);
        }}
        directionFilter={directionFilter}
        setDirectionFilter={(value) => {
          setDirectionFilter(value);
          setCurrentPage(1);
        }}
        alertFilter={alertFilter}
        setAlertFilter={(value) => {
          setAlertFilter(value);
          setCurrentPage(1);
        }}
        amountBounds={amountBounds}
        amountMin={effectiveAmountMin}
        amountMax={effectiveAmountMax}
        setAmountMin={(value) => {
          setAmountMinFilter(value);
          setCurrentPage(1);
        }}
        setAmountMax={(value) => {
          setAmountMaxFilter(value);
          setCurrentPage(1);
        }}
        clearAdvancedFilters={clearAdvancedFilters}
        hasActiveFilters={hasActiveFilters}
        handleSort={handleSort}
        renderSortIcon={renderSortIcon}
        sortedTransactionRows={sortedTransactionRows}
        currentPage={safeCurrentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        setPageSize={setPageSize}
        loadingReport={loadingReport}
        openTransactionDetails={openTransactionDetails}
      />

      {selectedTransaction && (
        <SelectedTransactionModal
          selectedTransaction={selectedTransaction}
          selectedTransactionLogs={selectedTransactionLogs as TransactionLog[]}
          selectedTransactionTotals={selectedTransactionTotals}
          loadingTransactionLogs={loadingTransactionLogs}
          cashiers={cashiers}
          closeTransactionDetails={closeTransactionDetails}
        />
      )}
    </div>
  );
}
