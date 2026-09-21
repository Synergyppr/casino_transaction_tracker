import { ArrowRight, Loader2, Minus, X } from "lucide-react";
import { Modal } from "../Modal";
import { fmt } from "@/app/lib/utils";
import {
  formatLogDateTime,
  formatLogValue,
  getChangedFieldRows,
  getChangedLogValues,
  TransactionLog,
} from "../ReportsView";

const SelectedTransactionModal = ({
  selectedTransaction,
  selectedTransactionLogs,
  selectedTransactionTotals,
  loadingTransactionLogs,
  cashiers,
  closeTransactionDetails,
}: {
  selectedTransaction: {
    id: string;
    playerName: string;
    gamerNumber?: string;
  };
  selectedTransactionLogs: TransactionLog[];
  selectedTransactionTotals: {
    incoming: number;
    outgoing: number;
  };
  loadingTransactionLogs: boolean;
  cashiers?: {
    id: string;
    name: string;
  }[];
  closeTransactionDetails: () => void;
}) => {
  return (
    <Modal>
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
            const changedFieldRows = getChangedFieldRows(
              changedValues.oldValues,
              changedValues.newValues
            );
            const values = changedValues.newValues;
            const changedBy =
              cashiers?.find((c) => c.id === log.changedByCashierId)?.name ??
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
                        className={`rounded-sm px-1.5 py-0.5 text-xs font-mono ${values.direction === "incoming"
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

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
                        Changes
                      </p>

                      <span className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                        {changedFieldRows.length}{" "}
                        {changedFieldRows.length === 1 ? "field" : "fields"}
                      </span>
                    </div>

                    {changedFieldRows.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 rounded-sm border border-border bg-secondary/30 px-3 py-5 text-xs text-muted-foreground">
                        <Minus size={13} />
                        No value changes were recorded.
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-sm border border-border">
                        {changedFieldRows.map((field, index) => {
                          const oldDisplayValue = field.hasOldValue
                            ? formatLogValue(field.key, field.oldValue)
                            : "Not set";
                          const newDisplayValue = field.hasNewValue
                            ? formatLogValue(field.key, field.newValue)
                            : "Removed";

                          return (
                            <div
                              key={field.key}
                              className={`p-3 ${index !== changedFieldRows.length - 1
                                  ? "border-b border-border"
                                  : ""
                                }`}
                            >
                              <p className="mb-2 text-xs font-semibold text-foreground">
                                {field.label}
                              </p>

                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch">
                                <div className="min-w-0 rounded-sm border border-rose-500/20 bg-rose-500/5 p-2.5">
                                  <p className="mb-1 text-[9px] font-mono uppercase tracking-wider text-rose-400">
                                    Previous
                                  </p>
                                  <p
                                    className="wrap-break-word whitespace-pre-wrap text-xs text-muted-foreground"
                                    title={oldDisplayValue}
                                  >
                                    {oldDisplayValue}
                                  </p>
                                </div>

                                <div className="flex items-center justify-center">
                                  <div className="flex size-7 rotate-90 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground sm:rotate-0">
                                    <ArrowRight size={13} />
                                  </div>
                                </div>

                                <div className="min-w-0 rounded-sm border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                                  <p className="mb-1 text-[9px] font-mono uppercase tracking-wider text-emerald-400">
                                    Updated
                                  </p>
                                  <p
                                    className="wrap-break-word whitespace-pre-wrap text-xs font-medium text-foreground"
                                    title={newDisplayValue}
                                  >
                                    {newDisplayValue}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
  );
};

export default SelectedTransactionModal;
