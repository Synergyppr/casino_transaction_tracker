import { ChevronLeft, ChevronRight, Eye, FilterX, Search } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { fmt } from "../lib/utils";
import type {
  AlertFilter,
  DirectionFilter,
  SortKey,
  TransactionRow,
} from "./ReportsView";
import { formatDateOnly } from "./ReportsView";

const ReportsViewTable = ({
  transactionRows,
  filteredTransactionRows,
  paginatedTransactionRows,
  categoryOptions,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  directionFilter,
  setDirectionFilter,
  alertFilter,
  setAlertFilter,
  amountBounds,
  amountMin,
  amountMax,
  setAmountMin,
  setAmountMax,
  clearAdvancedFilters,
  hasActiveFilters,
  handleSort,
  renderSortIcon,
  sortedTransactionRows,
  currentPage,
  setCurrentPage,
  totalPages,
  pageSize,
  setPageSize,
  loadingReport,
  openTransactionDetails,
}: {
  transactionRows: TransactionRow[];
  filteredTransactionRows: TransactionRow[];
  paginatedTransactionRows: TransactionRow[];
  totals: { incoming: number; outgoing: number; txns: number };
  categoryOptions: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  directionFilter: DirectionFilter;
  setDirectionFilter: (direction: DirectionFilter) => void;
  alertFilter: AlertFilter;
  setAlertFilter: (alertLevel: AlertFilter) => void;
  amountBounds: { min: number; max: number };
  amountMin: number;
  amountMax: number;
  setAmountMin: (amount: number) => void;
  setAmountMax: (amount: number) => void;
  clearAdvancedFilters: () => void;
  hasActiveFilters: boolean;
  handleSort: (columnKey: SortKey) => void;
  renderSortIcon: (columnKey: SortKey) => ReactNode;
  sortedTransactionRows: TransactionRow[];
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  loadingReport?: boolean;
  openTransactionDetails: (transactionRowData: TransactionRow) => void;
}) => {
  const handleDirectionChange = (direction: DirectionFilter) => {
    setDirectionFilter(direction);
    setCategoryFilter("all");
  };

  const filteredTotals = filteredTransactionRows.reduce((sum, row) => ({ incoming: sum.incoming + (row.direction === "incoming" ? row.amount : 0), outgoing: sum.outgoing + (row.direction === "outgoing" ? row.amount : 0), txns: sum.txns + 1 }), { incoming: 0, outgoing: 0, txns: 0 });

  return (
    <div>
      <div className="lg:hidden mb-3 space-y-2">
        <p className="text-xs text-muted-foreground">Sort transactions</p>
        <div className="flex flex-wrap gap-2">
          {([{ key: "dateTime", label: "Date & Time" }, { key: "player", label: "Player" }, { key: "direction", label: "Direction" }, { key: "category", label: "Category" }, { key: "amount", label: "Amount" }] as { key: SortKey; label: string }[]).map(({ key, label }) => <button type="button" key={key} onClick={() => handleSort(key)} className="inline-flex items-center gap-1.5 rounded border border-border bg-secondary px-2.5 py-2 text-xs">{label}{renderSortIcon(key)}</button>)}
        </div>
      </div>
      <div className="mb-3 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
            Transaction Detail
          </p>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              aria-label="Search transactions"
              className="h-9 w-full rounded-sm border border-border bg-secondary pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto]">
          <label className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Direction
            </span>
            <select
              value={directionFilter}
              onChange={(e) =>
                handleDirectionChange(e.target.value as DirectionFilter)
              }
              aria-label="Filter transactions by direction"
              className="h-9 w-full rounded-sm border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
            >
              <option value="all">All Directions</option>
              <option value="incoming">Cash In</option>
              <option value="outgoing">Cash Out</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Category
            </span>
            <select
              value={categoryFilter}
              disabled={directionFilter === "all"}
              title={directionFilter === "all" ? "Select Cash In or Cash Out to filter by category" : undefined}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter transactions by category"
              className="h-9 w-full rounded-sm border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Alerts
            </span>
            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value as AlertFilter)}
              aria-label="Filter transactions by player alert status"
              className="h-9 w-full rounded-sm border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
            >
              <option value="all">All Alert Levels</option>
              <option value="normal">No Alert</option>
              <option value="warning">Warning</option>
              <option value="compliance">Compliance</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={clearAdvancedFilters}
              disabled={!hasActiveFilters}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-sm border border-border bg-secondary px-3 text-xs text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto cursor-pointer"
            >
              <FilterX size={13} />
              Clear Filters
            </button>
          </div>
        </div>

        <div className="rounded-sm border border-border bg-secondary/30 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Amount Range
            </span>
            <span className="text-xs font-mono text-foreground">
              {fmt(amountMin)} – {fmt(amountMax)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(90px,0.35fr)_minmax(0,1fr)_minmax(90px,0.35fr)] sm:items-end">
            <label className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Start
              </span>
              <input
                type="number"
                min={amountBounds.min}
                max={amountMax}
                step={50}
                value={amountMin}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (!Number.isFinite(value)) return;

                  setAmountMin(
                    Math.min(amountMax, Math.max(amountBounds.min, value))
                  );
                }}
                className="h-9 w-full rounded-sm border border-border bg-secondary px-3 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
                aria-label="Minimum transaction amount"
              />
            </label>

            <div className="space-y-2">
              <div className="relative h-6">
                <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" />

                <input
                  type="range"
                  min={amountBounds.min}
                  max={amountBounds.max}
                  step={50}
                  value={amountMin}
                  onChange={(e) => {
                    const value = Math.min(Number(e.target.value), amountMax);
                    setAmountMin(value);
                  }}
                  aria-label="Minimum transaction amount slider"
                  className="pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:cursor-pointer"
                />

                <input
                  type="range"
                  min={amountBounds.min}
                  max={amountBounds.max}
                  step={50}
                  value={amountMax}
                  onChange={(e) => {
                    const value = Math.max(Number(e.target.value), amountMin);
                    setAmountMax(value);
                  }}
                  aria-label="Maximum transaction amount slider"
                  className="pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>{fmt(amountBounds.min)}</span>
                <span>Step $50</span>
                <span>{fmt(amountBounds.max)}</span>
              </div>
            </div>

            <label className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                End
              </span>
              <input
                type="number"
                min={amountMin}
                max={amountBounds.max}
                step={50}
                value={amountMax}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (!Number.isFinite(value)) return;

                  setAmountMax(
                    Math.max(amountMin, Math.min(amountBounds.max, value))
                  );
                }}
                className="h-9 w-full rounded-sm border border-border bg-secondary px-3 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
                aria-label="Maximum transaction amount"
              />
            </label>
          </div>
        </div>

        {hasActiveFilters && (
          <p className="text-[11px] text-muted-foreground font-mono">
            {filteredTransactionRows.length} of {transactionRows.length}{" "}
            transactions match the active filters.
          </p>
        )}
      </div>

      <div className="bg-card border border-border rounded overflow-x-auto">
        <table role="table" data-mobile-stack
          className="w-full lg:min-w-225 lg:table-fixed text-sm
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
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[22%]" />
            <col className="w-[9%]" />
            <col className="w-[24%]" />
            <col className="w-[12%]" />
            <col className="w-[15%]" />
          </colgroup>

          <thead role="rowgroup" className="max-lg:hidden">
            <tr role="row" className="border-b border-border bg-secondary/40">
              <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                <button
                  type="button"
                  onClick={() => handleSort("dateTime")}
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                >
                  Date & Time
                  {renderSortIcon("dateTime")}
                </button>
              </th>
              <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                <button
                  type="button"
                  onClick={() => handleSort("player")}
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                >
                  Player
                  {renderSortIcon("player")}
                </button>
              </th>
              <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                <button
                  type="button"
                  onClick={() => handleSort("direction")}
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                >
                  Dir.
                  {renderSortIcon("direction")}
                </button>
              </th>
              <th role="columnheader" className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                <button
                  type="button"
                  onClick={() => handleSort("category")}
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                >
                  Category
                  {renderSortIcon("category")}
                </button>
              </th>
              <th role="columnheader" className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                <button
                  type="button"
                  onClick={() => handleSort("amount")}
                  className="ml-auto inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                >
                  Amount
                  {renderSortIcon("amount")}
                </button>
              </th>
              {/* <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
              Cashier
            </th> */}
              <th role="columnheader" className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">
                Details
              </th>
            </tr>
          </thead>

          <tbody role="rowgroup">
            {sortedTransactionRows.length === 0 ? (
              <tr role="row">
                <td role="cell" data-label=""
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground text-sm"
                >
                  {loadingReport
                    ? "Loading..."
                    : hasActiveFilters
                      ? "No transactions match the active filters."
                      : "No transactions for this date."}
                </td>
              </tr>
            ) : (
              paginatedTransactionRows.map((t, i) => (
                <tr role="row"
                  key={t.id}
                  className={`border-b border-border last:border-0 ${((currentPage - 1) * pageSize + i) % 2 === 1
                    ? "bg-secondary/20"
                    : ""
                    }`}
                >
                  <td role="cell" data-label="Date & Time" className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap"><div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                    {formatDateOnly(t.date)} {t.time}
                  </div></td>

                  <td role="cell" data-label="Player" className="px-4 py-3 overflow-hidden"><div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                    <p className="truncate font-semibold" title={t.playerName}>
                      {t.playerName}
                    </p>
                    {t.gamerNumber && (
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {t.gamerNumber}
                      </p>
                    )}
                  </div></td>

                  <td role="cell" data-label="Direction" className="px-4 py-3"><div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
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
                  </div></td>

                  <td role="cell" data-label="Category" className="px-4 py-3 overflow-hidden text-xs text-muted-foreground"><div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                    <p className="truncate" title={t.category || "Other"}>
                      {t.category || "Other"}
                    </p>
                  </div></td>

                  <td role="cell" data-label="Amount" className="px-4 py-3 text-right font-mono text-xs text-foreground"><div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                    {fmt(Number(t.amount) || 0)}
                  </div></td>

                  {/* <td className="px-4 py-3 text-xs text-muted-foreground">
                  {t.cashierName}
                </td> */}

                  <td role="cell" data-label="Details" className="px-4 py-3 text-right"><div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                    <button
                      onClick={() => openTransactionDetails(t)}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground 
                    transition-colors hover:text-foreground hover:bg-accent/10 cursor-pointer"
                    >
                      <Eye size={12} />
                      View Details
                    </button>
                  </div></td>
                </tr>
              ))
            )}
          </tbody>

          {transactionRows?.length > 0 && (
            <tfoot role="rowgroup">
              <tr role="row" className="border-t border-border bg-secondary/40">
                <td role="cell" data-label=""
                  colSpan={4}
                  className="px-4 py-2.5 text-xs font-semibold text-muted-foreground"
                >
                  Totals
                </td>
                <td role="cell" data-label="Cash In / Cash Out" className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-foreground"><div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                  In {fmt(filteredTotals.incoming)} / Out {fmt(filteredTotals.outgoing)}
                </div></td>
                <td role="cell" data-label="Transactions" className="px-4 py-2.5 text-right text-xs text-muted-foreground"><div className="max-lg:min-w-0 max-lg:max-w-full max-lg:w-full max-lg:wrap-anywhere
                      max-lg:[&>.flex]:flex-wrap max-lg:[&>.flex]:justify-start max-lg:[&>.flex]:flex-col max-lg:[&>.flex]:items-stretch
                      max-lg:[&_.truncate]:whitespace-normal max-lg:[&_.truncate]:overflow-visible
                      max-lg:[&_.whitespace-nowrap]:whitespace-normal max-lg:[&_button]:max-w-full max-lg:[&_button]:whitespace-normal">
                  {filteredTotals.txns} txns
                </div></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {sortedTransactionRows.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-x border-b border-border rounded-b bg-card px-4 py-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, sortedTransactionRows.length)}{" "}
              of {sortedTransactionRows.length}
            </span>

            <label className="flex items-center gap-2">
              Rows
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 rounded-sm border border-border bg-secondary px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-border bg-secondary px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={13} />
              Previous
            </button>

            <span className="min-w-20 text-center text-xs text-muted-foreground font-mono">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={currentPage === totalPages}
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-border bg-secondary px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              Next
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsViewTable;
