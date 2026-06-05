"use client";

import { useMemo } from "react";
import type { Player, Cashier } from "../lib/types";
import { fmt } from "../lib/utils";

export function AuditView({ players, cashiers }: { players: Player[]; cashiers: Cashier[] }) {
  const rows = useMemo(
    () =>
      players
        .flatMap((p) =>
          p.transactions.map((t) => ({
            ...t,
            playerName: p.name,
            date: p.date,
            cashierName: cashiers.find((c) => c.id === t.cashierId)?.name ?? "Unknown",
          }))
        )
        .sort((a, b) => (b.date + b.timestamp).localeCompare(a.date + a.timestamp)),
    [players, cashiers]
  );

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
          Transaction Audit Log
        </p>
        <span className="text-xs text-muted-foreground font-mono">{rows.length} records</span>
      </div>

      <div className="bg-card border border-border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Date</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Time</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Player</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Dir.</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Category</th>
              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Amount</th>
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Cashier</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                  No transactions recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((t, i) => (
                <tr
                  key={t.id}
                  className={`border-b border-border last:border-0 ${
                    i % 2 === 1 ? "bg-secondary/20" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{t.date}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{t.timestamp}</td>
                  <td className="px-4 py-2.5 font-semibold">{t.playerName}</td>
                  <td className="px-4 py-2.5">
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
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.category}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-foreground">
                    {fmt(t.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.cashierName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
