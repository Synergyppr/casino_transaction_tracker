"use client";

import type { Player, Cashier } from "../lib/types";
import { getPlayerTotals, getStatus } from "../lib/utils";
import { StatusBadge } from "./StatusBadge";
import { AmtCell } from "./AmtCell";

export function PlayerTable({
  players,
  cashiers,
  showCashier = false,
}: {
  players: Player[];
  cashiers?: Cashier[];
  showCashier?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40">
            <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Player</th>
            <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Cash In</th>
            <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Cash Out</th>
            <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Txns</th>
            <th className="text-center px-4 py-2.5 text-xs text-muted-foreground font-medium">Status</th>
            {showCashier && cashiers && (
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Created by</th>
            )}
          </tr>
        </thead>
        <tbody>
          {players.length === 0 ? (
            <tr>
              <td
                colSpan={showCashier ? 6 : 5}
                className="px-4 py-10 text-center text-muted-foreground text-sm"
              >
                No players recorded.
              </td>
            </tr>
          ) : (
            players.map((p, i) => {
              const { incoming, outgoing } = getPlayerTotals(p);
              const status = getStatus(incoming, outgoing);
              const cashierName = cashiers?.find((c) => c.id === p.createdBy)?.name;
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
                  <td className="px-4 py-3 font-semibold text-foreground">{p.name}</td>
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
                  {showCashier && cashiers && (
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {cashierName ?? "\u2014"}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
