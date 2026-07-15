"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Player, Cashier } from "../lib/types";
import { getPlayerTotals, getStatus } from "../lib/utils";
import { StatusBadge } from "./StatusBadge";
import { AmtCell } from "./AmtCell";

export function PlayerTable({
  players,
  cashiers,
  showCashier = false,
  page,
  pageSize = 10,
  onPageChange,
}: {
  players: Player[];
  cashiers?: Cashier[];
  showCashier?: boolean;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}) {
  const [internalPage, setInternalPage] = useState(1);

  const requestedPage = page ?? internalPage;

  const totalPages = Math.max(1, Math.ceil(players.length / pageSize));

  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);

  const changePage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);

    if (onPageChange) {
      onPageChange(safePage);
      return;
    }

    setInternalPage(safePage);
  };

  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return players.slice(startIndex, startIndex + pageSize);
  }, [players, currentPage, pageSize]);

  const firstItem = players.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;

  const lastItem = Math.min(currentPage * pageSize, players.length);

  return (
    <div className="bg-card border border-border rounded overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Player
              </th>

              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Cash In
              </th>

              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Cash Out
              </th>

              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Txns
              </th>

              <th className="text-center px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Status
              </th>

              {showCashier && cashiers && (
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Created by
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {players.length === 0 ? (
              <tr>
                <td
                  colSpan={showCashier && cashiers ? 6 : 5}
                  className="px-4 py-10 text-center text-muted-foreground text-sm"
                >
                  No players recorded.
                </td>
              </tr>
            ) : (
              paginatedPlayers.map((p, i) => {
                const { incoming, outgoing } = getPlayerTotals(p);

                const status = getStatus(incoming, outgoing);

                const absoluteIndex = (currentPage - 1) * pageSize + i;

                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border last:border-0 ${
                      status === "compliance"
                        ? "bg-emerald-500/5"
                        : status === "warning"
                        ? "bg-amber-500/5"
                        : absoluteIndex % 2 === 1
                        ? "bg-secondary/20"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-foreground">
                      <div>
                        <p>{p.name}</p>

                        {p.gamerNumber && (
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {p.gamerNumber}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <AmtCell amount={incoming} />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <AmtCell amount={outgoing} />
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      {p.transactions?.length || 0}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={status} />
                    </td>

                    {showCashier && cashiers && (
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {p.createdBy ?? "—"}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {players.length > pageSize && (
        <div className="flex flex-col gap-3 border-t border-border bg-secondary/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground font-mono">
            Showing {firstItem}–{lastItem} of {players.length} players
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-sm border border-border bg-secondary px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              aria-label="Previous players page"
            >
              <ChevronLeft size={13} />
              Previous
            </button>

            <span className="min-w-18.5 text-center text-[11px] text-muted-foreground font-mono">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-sm border border-border bg-secondary px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              aria-label="Next players page"
            >
              Next
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
