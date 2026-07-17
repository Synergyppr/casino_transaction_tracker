import { ArrowDownCircle, ArrowUpCircle, Loader2, X } from "lucide-react";
import { Modal } from "../Modal";
import { Direction } from "@/app/lib/types";
import { CASH_IN_TYPES, CASH_OUT_TYPES } from "@/app/lib/constants";
import React from "react";
import { TxnDraft } from "../DailyEntryView";

const ManageTransactionModal = ({
  txnModal,
  setTxnModal,
  txnError,
  setTxnError,
  amountFocused,
  setAmountFocused,
  customCategory,
  setCustomCategory,
  cashInCategory,
  setCashInCategory,
  cashOutCategory,
  setCashOutCategory,
  saving,
  submitTxn,
}: {
  txnModal: TxnDraft | null;
  setTxnModal: React.Dispatch<React.SetStateAction<TxnDraft | null>>;
  txnError: string;
  setTxnError: (value: string) => void;
  amountFocused: boolean;
  setAmountFocused: (value: boolean) => void;
  customCategory: string;
  setCustomCategory: (value: string) => void;
  cashInCategory: string;
  setCashInCategory: (value: string) => void;
  cashOutCategory: string;
  setCashOutCategory: (value: string) => void;
  saving: boolean;
  submitTxn: () => void;
}) => {
  return (
    <Modal
      onClose={() => {
        setTxnModal(null);
        setTxnError("");
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold">
            {txnModal?.mode === "update"
              ? "Update Transaction"
              : "Add Transaction"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {txnModal?.playerName}
          </p>
        </div>

        <button
          onClick={() => {
            setTxnModal(null);
            setTxnError("");
          }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Direction */}
      <div className="mb-4">
        <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
          Direction
        </label>

        <div className="flex gap-2">
          {(["incoming", "outgoing"] as Direction[]).map((dir) => (
            <button
              key={dir}
              onClick={() =>
                setTxnModal((prev) =>
                  prev
                    ? {
                        ...prev,
                        direction: dir,
                        category:
                          dir === "incoming" ? cashInCategory : cashOutCategory,
                      }
                    : prev
                )
              }
              className={`flex-1 h-9 rounded-sm text-sm flex items-center justify-center gap-2 transition-colors border ${
                txnModal?.direction === dir
                  ? dir === "incoming"
                    ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                    : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {dir === "incoming" ? (
                <ArrowDownCircle size={13} />
              ) : (
                <ArrowUpCircle size={13} />
              )}
              {dir === "incoming" ? "Cash In" : "Cash Out"}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="mb-4">
        <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
          Category
        </label>

        <select
          value={txnModal?.category}
          onChange={(e) => {
            const nextCategory = e.target.value;

            if (txnModal?.direction === "incoming") {
              setCashInCategory(nextCategory);
            } else {
              setCashOutCategory(nextCategory);
            }

            setTxnModal((prev) =>
              prev ? { ...prev, category: nextCategory } : prev
            );
          }}
          className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
        >
          {(txnModal?.direction === "incoming"
            ? CASH_IN_TYPES
            : CASH_OUT_TYPES
          ).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {txnModal?.category?.includes("Other") && (
          <input
            type="text"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="Specify category..."
            disabled={saving}
            className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50 mt-2"
          />
        )}
      </div>

      {/* Amount */}
      <div className="mb-5">
        <label
          htmlFor="currency"
          className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider"
        >
          Amount (USD)
        </label>

        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-muted-foreground">
            $
          </span>

          <input
            type="text"
            id="currency"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={
              amountFocused
                ? txnModal?.amount
                : txnModal?.amount
                ? Number(txnModal?.amount).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : ""
            }
            onFocus={(e) => {
              setAmountFocused(true);

              requestAnimationFrame(() => {
                e.target.select();
              });
            }}
            onBlur={() => {
              setAmountFocused(false);

              const amount = Number(txnModal?.amount);

              if (!Number.isFinite(amount) || amount <= 0) return;

              setTxnModal((prev) =>
                prev
                  ? {
                      ...prev,
                      amount: Math.min(amount, 1000000).toFixed(2),
                    }
                  : prev
              );
            }}
            onChange={(e) => {
              let value = e.target.value
                .replace(/[$,\s]/g, "")
                .replace(/[^\d.]/g, "");

              const decimalIndex = value.indexOf(".");

              if (decimalIndex !== -1) {
                value =
                  value.slice(0, decimalIndex + 1) +
                  value
                    .slice(decimalIndex + 1)
                    .replace(/\./g, "")
                    .slice(0, 2);
              }

              if (value.startsWith(".")) {
                value = `0${value}`;
              }

              const numericValue = Number(value);

              if (
                value !== "" &&
                value !== "0." &&
                Number.isFinite(numericValue) &&
                numericValue > 1000000
              ) {
                value = "1000000";
              }

              setTxnModal((prev) =>
                prev
                  ? {
                      ...prev,
                      amount: value,
                    }
                  : prev
              );

              setTxnError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitTxn();
              }
            }}
            disabled={saving}
            className="w-full h-9 pl-8 pr-3 bg-secondary border border-border rounded-sm text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
            autoFocus
          />
        </div>

        {txnError && (
          <p className="text-xs text-destructive mt-1.5">{txnError}</p>
        )}
      </div>

      {txnModal?.mode === "update" && (
        <div className="space-y-4 mb-5">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
              Status
            </label>

            {(() => {
              const amount = Number(txnModal.amount) || 0;

              const status =
                amount >= 1000000
                  ? {
                      label: "COMPLIANCE REQ.",
                      className:
                        "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
                    }
                  : amount >= 7500
                  ? {
                      label: "APPROACHING",
                      className:
                        "text-amber-400 border-amber-500/30 bg-amber-500/10",
                    }
                  : {
                      label: "NORMAL",
                      className: "text-foreground border-border bg-secondary",
                    };

              return (
                <div
                  className={`h-9 px-3 rounded-sm border flex items-center font-mono text-sm font-semibold ${status.className}`}
                >
                  {status.label}
                </div>
              );
            })()}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
              Notes
            </label>

            <textarea
              value={txnModal?.notes || ""}
              onChange={(e) =>
                setTxnModal((prev) =>
                  prev ? { ...prev, notes: e.target.value } : prev
                )
              }
              placeholder="Optional notes..."
              disabled={saving}
              rows={3}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-sm text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
              Reason for Update
            </label>

            <textarea
              value={txnModal?.reason || ""}
              onChange={(e) =>
                setTxnModal((prev) =>
                  prev ? { ...prev, reason: e.target.value } : prev
                )
              }
              placeholder="Explain why this transaction is being updated..."
              disabled={saving}
              rows={3}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-sm text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50 resize-none"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={submitTxn}
          disabled={saving}
          className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          {txnModal?.mode === "update"
            ? "Update Transaction"
            : "Record Transaction"}
        </button>

        <button
          onClick={() => {
            setTxnModal(null);
            setTxnError("");
          }}
          className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
};

export default ManageTransactionModal;
