import { FileEditIcon, X } from "lucide-react";
import { Modal } from "../Modal";
import { Player, Transaction } from "@/app/lib/types";
import React from "react";

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
  return (
    <Modal onClose={() => setListModal(null)}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold">Transactions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {listModal?.name}
          </p>
        </div>

        <button
          onClick={() => setListModal(null)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="space-y-2">
        {listModal?.transactions?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No transactions recorded.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {listModal?.transactions?.map((txn) => (
              <button
                key={txn.id}
                onClick={() => {
                  openTxn(listModal, txn);
                  setListModal(null);
                }}
                className={`px-2.5 py-1 rounded-sm border text-[11px] font-mono transition-colors ${
                  txn.direction === "incoming"
                    ? "bg-sky-500/10 text-sky-400 border-sky-500/25 hover:bg-sky-500/15"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/25 hover:bg-rose-500/15"
                }`}
              >
                {txn.direction === "incoming" ? "IN" : "OUT"} · {txn.category} ·{" "}
                {fmt(txn.amount)} ·{" "}
                <FileEditIcon
                  size={10}
                  className="inline text-accent cursor-pointer"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AllPlayerTransactionsModal;
