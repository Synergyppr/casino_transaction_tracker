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
        <table
          role="table"
          data-mobile-stack
          className="w-full lg:min-w-160 text-sm
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
              <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Player
              </th>

              <th role="columnheader" className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Cash In
              </th>

              <th role="columnheader" className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Cash Out
              </th>

              <th role="columnheader" className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Txns
              </th>

              <th role="columnheader" className="text-center px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Status
              </th>

              {showCashier && cashiers && (
                <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Created by
                </th>
              )}
            </tr>
          </thead>

          <tbody role="rowgroup">
            {players.length === 0 ? (
              <tr role="row">
                <td role="cell" data-label=""
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
                  <tr role="row"
                    key={p.id}
                    className={`border-b border-border last:border-0 
                      ${status === "compliance"
                        ? "bg-emerald-500/5"
                        : status === "warning"
                          ? "bg-amber-500/5"
                          : absoluteIndex % 2 === 1
                            ? "bg-secondary/20"
                            : ""
                      }`}
                  >
                    <td role="cell" data-label="Player" className="px-4 py-3 font-semibold text-foreground">
                      <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                        <div>
                          <p>{p.name}</p>
                          {p.gamerNumber && (
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              {p.gamerNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td
                      role="cell"
                      data-label="Cash In"
                      className="px-4 py-3 text-right">
                      <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                        <AmtCell amount={incoming} />
                      </div>
                    </td>
                    <td
                      role="cell"
                      data-label="Cash Out"
                      className="px-4 py-3 text-right">
                      <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                        <AmtCell amount={outgoing} />
                      </div>
                    </td>
                    <td
                      role="cell"
                      data-label="Transactions"
                      className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                        {p.transactions?.length || 0}
                      </div>
                    </td>
                    <td role="cell" data-label="Status" className="px-4 py-3 text-center">
                      <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                        <StatusBadge status={status} />
                      </div>
                    </td>
                    {showCashier && cashiers && (
                      <td role="cell" data-label="Created by" className="px-4 py-3 text-xs text-muted-foreground">
                        <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                          {p.createdBy ?? "—"}
                        </div>
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
