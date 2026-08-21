import React from "react";
import { ArrowDownCircle, ArrowUpCircle, FileEditIcon, X } from "lucide-react";
import { Modal } from "../Modal";
import { Player, Transaction } from "@/app/lib/types";
import { getTransactionById } from "@/app/lib/api";

const AllPlayerTransactionsModal = ({
  listModal,
  setListModal,
  openTxn,
  fmt,
}: {
  listModal: Player | null;
  setListModal: React.Dispatch<React.SetStateAction<Player | null>>;
  openTxn: (listModal: Player, txn: Transaction) => void;
  fmt: (amount: number) => string;
}) => {
  // const [transactionDetails, setTransactionDetails] = useState<Transaction | null>(null);

  const fetchAndOpenTransaction = async (txn: Transaction) => {
    try {
      const data = await getTransactionById(txn.id);

      const fetchedTxn: unknown = data;

      // setTransactionDetails(fetchedTxn);
      openTxn(listModal as Player, fetchedTxn as Transaction);

      // openTxn(listModal as Player, txn);
      setListModal(null);
    } catch (error) {
      console.error("Error fetching transaction:", error);
    }
  };

  return (
    <Modal onClose={() => setListModal(null)}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Transactions</h3>

          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {listModal?.name}
          </p>

          {!!listModal?.transactions?.length && (
            <p className="text-[11px] font-mono text-muted-foreground mt-1">
              {listModal.transactions.length}{" "}
              {listModal.transactions.length === 1
                ? "transaction"
                : "transactions"}{" "}
              recorded
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setListModal(null)}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Close transactions"
        >
          <X size={15} />
        </button>
      </div>

      <div className="space-y-2">
        {listModal?.transactions?.length === 0 ? (
          <div className="border border-dashed border-border rounded-sm px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No transactions recorded.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {listModal?.transactions?.map((txn, index) => {
              const isIncoming = txn.direction === "incoming";

              return (
                <button
                  key={txn.id}
                  type="button"
                  onClick={() => fetchAndOpenTransaction(txn)}
                  className="group w-full text-left rounded-sm border border-border bg-secondary/30 hover:bg-secondary/70 hover:border-accent/40 transition-all"
                >
                  <div className="flex items-stretch">
                    <div
                      className={`w-1 shrink-0 rounded-l-sm ${
                        isIncoming ? "bg-sky-500" : "bg-rose-500"
                      }`}
                    />

                    <div className="flex-1 min-w-0 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border ${
                              isIncoming
                                ? "bg-sky-500/10 text-sky-400 border-sky-500/25"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/25"
                            }`}
                          >
                            {isIncoming ? (
                              <ArrowDownCircle size={14} />
                            ) : (
                              <ArrowUpCircle size={14} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${
                                  isIncoming ? "text-sky-400" : "text-rose-400"
                                }`}
                              >
                                {isIncoming ? "Cash In" : "Cash Out"}
                              </span>

                              <span className="text-[10px] text-muted-foreground">
                                #{index + 1}
                              </span>
                            </div>

                            <p className="text-sm font-medium text-foreground mt-0.5 wrap-break-word">
                              {txn.category}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p
                            className={`text-sm font-mono font-semibold ${
                              isIncoming ? "text-sky-400" : "text-rose-400"
                            }`}
                          >
                            {fmt(txn.amount)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                            Date
                          </span>

                          <span className="text-[11px] text-foreground/80 break-all">
                            {txn?.date || "Not available"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground group-hover:text-accent transition-colors">
                          <FileEditIcon size={12} />
                          <span>Edit transaction</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AllPlayerTransactionsModal;
