import { AlertTriangle, X } from "lucide-react";
import { Modal } from "../Modal";
import { getPlayerTotals } from "@/app/lib/utils";
import { Player } from "@/app/lib/types";
import React from "react";

const DuplicatePlayerModal = ({
  dupModal,
  setDupModal,
  openTxn,
  createPlayer,
  resetPlayerDraft,
  saving,
  fmt,
}: {
  dupModal: { matches: Player[] } | null;
  setDupModal: React.Dispatch<
    React.SetStateAction<{ matches: Player[] } | null>
  >;
  openTxn: (player: Player) => void;
  createPlayer: () => void;
  resetPlayerDraft: () => void;
  saving: boolean;
  fmt: (amount: number) => string;
}) => {
  return (
    <Modal onClose={() => setDupModal(null)}>
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />

        <div>
          <h3 className="text-sm font-semibold">Possible Duplicate Player</h3>
          <p className="text-xs text-muted-foreground mt-1">
            A similar name already exists for today. How would you like to
            proceed?
          </p>
        </div>
      </div>

      <div className="bg-secondary border border-border rounded-sm p-3 mb-4 space-y-2">
        {dupModal?.matches?.map((m) => {
          const { incoming, outgoing } = getPlayerTotals(m);

          return (
            <div
              key={m.id}
              className="flex items-center justify-between text-xs"
            >
              <span className="font-semibold text-foreground">{m.name}</span>
              <span className="font-mono text-muted-foreground">
                IN {fmt(incoming)} &middot; OUT {fmt(outgoing)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => {
            openTxn(dupModal?.matches?.[0] as Player);
            setDupModal(null);
            resetPlayerDraft();
          }}
          className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors"
        >
          Use Existing Record
        </button>

        <button
          onClick={() => createPlayer()}
          disabled={saving}
          className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors disabled:opacity-50"
        >
          Create Separate
        </button>

        <button
          onClick={() => setDupModal(null)}
          className="w-full sm:w-9 h-9 bg-secondary border border-border rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </Modal>
  );
};

export default DuplicatePlayerModal;
