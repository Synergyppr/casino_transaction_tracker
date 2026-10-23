"use client";
import { useMemo } from "react";
import type { Player, Cashier } from "../lib/types";
import { fmt } from "../lib/utils";

export function AuditView({
  players,
  cashiers,
}: {
  players: Player[];
  cashiers: Cashier[];
}) {
  const rows = useMemo(
    () =>
      players
        .flatMap((p) =>
          p.transactions.map((t) => ({
            ...t,
            playerName: p.name,
            date: p.date,
            cashierName:
              cashiers.find((c) => c.id === t.cashierId)?.name ?? "Unknown",
          }))
        )
        .sort((a, b) =>
          (b.date + b.date).localeCompare(a.date + a.date)
        ),
    [players, cashiers]
  );

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
          Transaction Audit Log
        </p>
        <span className="text-xs text-muted-foreground font-mono">
          {rows.length} records
        </span>
      </div>

      <div className="bg-card border border-border rounded overflow-x-auto">
        <table role="table" data-mobile-stack
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
                Date
              </th>
              <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Time
              </th>
              <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Player
              </th>
              <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Dir.
              </th>
              <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Category
              </th>
              <th role="columnheader" className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Amount
              </th>
              <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Cashier
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {rows?.length === 0 ? (
              <tr role="row">
                <td role="cell" data-label=""
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground text-sm"
                >
                  No transactions recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((t, i) => (
                <tr role="row"
                  key={t.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-secondary/20" : ""
                    }`}
                >
                  <td role="cell" data-label="Date" className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                    <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                      {t.date.split(" ")[0]}
                    </div>
                  </td>
                  <td role="cell" data-label="Time" className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                    <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                      {t.date.split(" ")[1]}
                    </div>
                  </td>
                  <td role="cell" data-label="Player" className="px-4 py-2.5 font-semibold">
                    <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">{t.playerName}
                    </div>
                  </td>
                  <td role="cell" data-label="Direction" className="px-4 py-2.5">
                    <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-sm font-mono ${t.direction === "incoming"
                          ? "bg-sky-500/10 text-sky-400"
                          : "bg-rose-500/10 text-rose-400"
                          }`}
                      >
                        {t.direction === "incoming" ? "IN" : "OUT"}
                      </span>
                    </div>
                  </td>
                  <td role="cell" data-label="Category" className="px-4 py-2.5 text-xs text-muted-foreground"><div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                    {t.category}
                  </div>
                  </td>
                  <td role="cell" data-label="Amount" className="px-4 py-2.5 text-right font-mono text-xs text-foreground"><div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                    {fmt(t.amount)}
                  </div>
                  </td>
                  <td role="cell" data-label="Cashier" className="px-4 py-2.5 text-xs text-muted-foreground"><div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                    {t.cashierName}
                  </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
