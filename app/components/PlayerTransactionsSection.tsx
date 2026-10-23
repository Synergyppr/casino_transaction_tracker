"use client";
import { useState } from "react";
import { FileEdit, Loader2 } from "lucide-react";
import type { Player, Transaction } from "../lib/types";
import { getTransactionById, mapApiTransaction } from "../lib/api";
import { fmt } from "../lib/utils";

export function PlayerTransactionsSection({
  player,
  openTxn
}: {
  player: Player;
  openTxn: (player: Player,
    transaction: Transaction) => void
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function editTransaction(transaction: Transaction) {
    if (loadingId) return;
    setLoadingId(transaction.id); setError("");
    try {
      const details = await getTransactionById(transaction.id);
      openTxn(player, { ...mapApiTransaction(details), notes: details.notes } as Transaction & { notes: string | null });
    }
    catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load transaction. Please try again.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section
      id={`player-transactions-${player.id}`}
      aria-label={`Transactions for ${player.name}`}
      className="bg-secondary/20 p-3 sm:p-4"
    >
      <h3 className="mb-3 text-sm font-semibold">
        {player.name} · {player.transactions.length} {player.transactions.length === 1 ? "transaction" : "transactions"}
      </h3>
      {error &&
        <p role="alert" className="mb-3 text-xs text-destructive">
          {error}
        </p>
      }
      {player.transactions.length === 0 ?
        <p className="text-sm text-muted-foreground">No transactions recorded.</p>
        : <table role="table" data-mobile-stack
        className="w-full text-xs
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
            <tr role="row">
              <th
                role="columnheader"
                className="p-2 text-left">
                Date &amp; Time
              </th>
              <th
                role="columnheader"
                className="p-2 text-left">
                Direction
              </th>
              <th
                role="columnheader"
                className="p-2 text-left">
                Category
              </th>
              <th
                role="columnheader"
                className="p-2 text-right">
                Amount
              </th>
              <th
                role="columnheader"
                className="p-2 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {player.transactions.map(transaction =>
              <tr role="row" key={transaction.id} className="border-t border-border">
                <td role="cell" data-label="Date & Time" className="p-2">
                  <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                    {transaction.date || "Not available"}</div></td>
                <td role="cell" data-label="Direction"
                  className={`p-2 ${transaction.direction === "incoming" ? "text-emerald-400" : "text-rose-400"}`}>
                  <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                    {transaction.direction === "incoming" ? "Cash In" : "Cash Out"}
                  </div>
                </td>
                <td role="cell" data-label="Category" className="p-2">
                  <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">{transaction.category}
                  </div>
                </td>
                <td role="cell" data-label="Amount" className="p-2 text-right font-mono">
                  <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                    {fmt(transaction.amount)}
                  </div>
                </td>
                <td role="cell" data-label="Actions" className="p-2 text-right">
                  <div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                    <button
                      type="button"
                      disabled={loadingId !== null}
                      onClick={() => void editTransaction(transaction)}
                      className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-xs hover:bg-accent/15 disabled:opacity-50">
                      {loadingId === transaction.id ?
                        <Loader2 size={13} className="animate-spin"
                        /> : <FileEdit size={13} />
                      }
                      Edit Transaction
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      }
    </section>
  );
}
