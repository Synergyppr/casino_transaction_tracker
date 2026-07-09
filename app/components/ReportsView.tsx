"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Calendar, Download, Loader2, Eye, X } from "lucide-react";

import type { Player, ApiPlayer, ApiDailyReport, Cashier } from "../lib/types";
import { TODAY } from "../lib/constants";
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

function getDateOnly(value?: string) {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value;
}

function getTimeOnly(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeApiPlayerToPlayer(apiPlayer: ApiPlayer): Player {
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
        };
      }) || [],
  };
}

export function ReportsView({
  // players,
  selectedDate,
  setSelectedDate,
  apiPlayers,
  cashiers = [],
}: {
  players: Player[];
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  apiPlayers: ApiPlayer[];
  cashiers?: Cashier[];
}) {
  const [, setReportData] = useState<ApiDailyReport | null>(null);
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([]);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionRow | null>(null);
  const [loadingTransactionLogs, setLoadingTransactionLogs] = useState(false);
  const [reportPlayers, setReportPlayers] = useState<Player[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  const fetchReport = useCallback(async (date: string) => {
    if (!date) return;

    setLoadingReport(true);

    try {
      const report = await getDailyReport(date);
      setReportData(report);

      if (report && report.playerDetail.length > 0) {
        const built: Player[] = report.playerDetail.map((pd) => ({
          id: pd.playerId,
          name: pd.playerName,
          date,
          transactions:
            pd.transactions?.map((t) => {
              const tx = t as typeof t & {
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
                category: tx.category || "Other",
                amount: Number(tx.amount) || 0,
                timestamp: tx.timestamp || tx.createdAtUtc || "",
                cashierId: tx.createdByCashierId || "",
                cashierName: tx.cashierName,
              };
            }) || [],
          createdBy: "",
        }));

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
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await fetchReport(selectedDate);
    };

    fetchData();
  }, [selectedDate, fetchReport]);

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
          (p.transactions || []).map((t) => ({
            ...t,
            player: p,
            playerId: p.id,
            playerName: p.name,
            gamerNumber: p.gamerNumber,
            date: getDateOnly(p.date),
            time: getTimeOnly(t.timestamp || p.date),
            cashierName:
              "cashierName" in t && t.cashierName
                ? String(t.cashierName)
                : p.createdBy || "Unknown",
          }))
        )
        .sort((a, b) =>
          `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
        ),
    [datePlayers]
  );

  // useEffect(() => {
  //   console.log("Report Players:", reportPlayers);
  //   console.log("Normalized API Players:", normalizedApiPlayers);
  // }, [reportPlayers, normalizedApiPlayers]);

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
    <div className="p-5 space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            max={TODAY}
            onChange={(e) => setSelectedDate(e.target.value)}
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
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-3">
          Transaction Detail
        </p>

        <div className="bg-card border border-border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Time
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Player
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Dir.
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Category
                </th>
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Amount
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Cashier
                </th>
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Details
                </th>
              </tr>
            </thead>

            <tbody>
              {transactionRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-muted-foreground text-sm"
                  >
                    {loadingReport
                      ? "Loading..."
                      : "No transactions for this date."}
                  </td>
                </tr>
              ) : (
                transactionRows.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`border-b border-border last:border-0 ${
                      i % 2 === 1 ? "bg-secondary/20" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {t.time}
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

                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {t.cashierName}
                    </td>

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
