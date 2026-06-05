"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import type { Player, AlertStatus } from "../lib/types";
import { WARNING_THRESHOLD, COMPLIANCE_THRESHOLD } from "../lib/constants";
import { getPlayerTotals, getStatus, fmt } from "../lib/utils";
import { StatusBadge } from "./StatusBadge";
import { AmtCell } from "./AmtCell";

export function MonitoringView({ players }: { players: Player[] }) {
  const [filter, setFilter] = useState<AlertStatus | "all">("all");

  const counts = useMemo(
    () => ({
      all: players.length,
      compliance: players.filter((p) => {
        const { incoming, outgoing } = getPlayerTotals(p);
        return getStatus(incoming, outgoing) === "compliance";
      }).length,
      warning: players.filter((p) => {
        const { incoming, outgoing } = getPlayerTotals(p);
        return getStatus(incoming, outgoing) === "warning";
      }).length,
      normal: players.filter((p) => {
        const { incoming, outgoing } = getPlayerTotals(p);
        return getStatus(incoming, outgoing) === "normal";
      }).length,
    }),
    [players]
  );

  const displayed = players.filter((p) => {
    if (filter === "all") return true;
    const { incoming, outgoing } = getPlayerTotals(p);
    return getStatus(incoming, outgoing) === filter;
  });

  const tabs = [
    { key: "all", label: "All", cls: "text-foreground" },
    { key: "compliance", label: "Compliance", cls: "text-emerald-400" },
    { key: "warning", label: "Warning", cls: "text-amber-400" },
    { key: "normal", label: "Normal", cls: "text-muted-foreground" },
  ] as const;

  return (
    <div className="p-5 space-y-5">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors border flex items-center gap-1.5 ${
              filter === t.key
                ? t.key === "compliance"
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : t.key === "warning"
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-accent/15 text-accent border-accent/30"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {t.label}
            <span className="font-mono">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Player</th>
              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Cash In</th>
              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Cash Out</th>
              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Txns</th>
              <th className="text-center px-4 py-2.5 text-xs text-muted-foreground font-medium">Status</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Required Action</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">
                  No players in this category.
                </td>
              </tr>
            ) : (
              displayed.map((p, i) => {
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
                        : i % 2 === 1
                        ? "bg-secondary/20"
                        : ""
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
                      {p.transactions.length}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {status === "compliance" && (
                        <span className="text-emerald-400">File compliance documentation</span>
                      )}
                      {status === "warning" && (
                        <span className="text-amber-400">Prepare ID & documentation</span>
                      )}
                      {status === "normal" && (
                        <span className="text-muted-foreground">\u2014</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Threshold reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-amber-950/25 border border-amber-500/20 rounded p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={12} className="text-amber-400" />
            <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
              Warning Threshold
            </span>
          </div>
          <p className="text-2xl font-mono font-semibold text-amber-400">{fmt(WARNING_THRESHOLD)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Per direction \u2014 cash in and cash out tracked independently
          </p>
        </div>
        <div className="bg-emerald-950/25 border border-emerald-500/20 rounded p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={12} className="text-emerald-400" />
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Compliance Threshold
            </span>
          </div>
          <p className="text-2xl font-mono font-semibold text-emerald-400">{fmt(COMPLIANCE_THRESHOLD)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Documentation required \u2014 player may continue gaming
          </p>
        </div>
      </div>
    </div>
  );
}
