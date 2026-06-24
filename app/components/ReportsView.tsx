"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Download, Loader2 } from "lucide-react";
import type { Player, ApiPlayer, ApiDailyReport } from "../lib/types";
import { TODAY } from "../lib/constants";
import { getPlayerTotals, getStatus, fmt, fmtDate } from "../lib/utils";
import { getDailyReport } from "../lib/api";
import { StatusBadge } from "./StatusBadge";
import { AmtCell } from "./AmtCell";

export function ReportsView({
  players,
  selectedDate,
  setSelectedDate,
  apiPlayers,
}: {
  players: Player[];
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  apiPlayers: ApiPlayer[];
}) {
  const [reportData, setReportData] = useState<ApiDailyReport | null>(null);
  const [reportPlayers, setReportPlayers] = useState<Player[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  const fetchReport = useCallback(async (date: string) => {
    if (date === TODAY) {
      setReportPlayers(players.filter((p) => p.date === TODAY));
      setReportData(null);
      return;
    }
    setLoadingReport(true);
    try {
      const report = await getDailyReport(date);
      setReportData(report);
      if (report && report.playerDetail.length > 0) {
        const built: Player[] = report.playerDetail.map((pd) => ({
          id: pd.playerId,
          name: pd.playerName,
          date,
          transactions: pd.transactions?.map((t) => ({
            id: t.id,
            direction: t.direction === "outgoing" ? "outgoing" as const : "incoming" as const,
            category: t.category || "Other",
            amount: t.amount,
            timestamp: "",
            cashierId: t.createdByCashierId || "",
          })) || [],
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
  }, [players]);

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate, fetchReport]);

  const datePlayers = selectedDate === TODAY
    ? players.filter((p) => p.date === TODAY)
    : reportPlayers;

  const totals = datePlayers.reduce(
    (acc, p) => {
      const { incoming, outgoing } = getPlayerTotals(p);
      return {
        incoming: acc.incoming + incoming,
        outgoing: acc.outgoing + outgoing,
        txns: acc.txns + p.transactions.length,
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
          {loadingReport && <Loader2 size={14} className="animate-spin text-accent" />}
        </div>
        <button className="flex items-center gap-2 px-4 h-9 bg-secondary border border-border rounded-sm text-sm text-muted-foreground hover:text-foreground transition-colors">
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
            { label: "Players", value: String(datePlayers.length) },
            { label: "Transactions", value: String(totals.txns) },
            { label: "Total Cash In", value: fmt(totals.incoming), mono: true },
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
                className={`text-2xl font-semibold ${s.mono ? "font-mono" : ""} ${
                  s.highlight ? "text-emerald-400" : "text-foreground"
                }`}
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
          Player Detail
        </p>
        <div className="bg-card border border-border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Player</th>
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Cash In</th>
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Cash Out</th>
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Net</th>
                <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Txns</th>
                <th className="text-center px-4 py-2.5 text-xs text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {datePlayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    {loadingReport ? "Loading..." : "No data for this date."}
                  </td>
                </tr>
              ) : (
                datePlayers.map((p, i) => {
                  const { incoming, outgoing } = getPlayerTotals(p);
                  const status = getStatus(incoming, outgoing);
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border last:border-0 ${
                        i % 2 === 1 ? "bg-secondary/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold">{p.name}</td>
                      <td className="px-4 py-3 text-right">
                        <AmtCell amount={incoming} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AmtCell amount={outgoing} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        {fmt(incoming - outgoing)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        {p.transactions.length}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {datePlayers.length > 0 && (
              <tfoot>
                <tr className="border-t border-border bg-secondary/40">
                  <td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Totals</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-foreground">
                    {fmt(totals.incoming)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-foreground">
                    {fmt(totals.outgoing)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                    {fmt(totals.incoming - totals.outgoing)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                    {totals.txns}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
