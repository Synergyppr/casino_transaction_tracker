import { Loader2, Search, X } from "lucide-react";
import { Modal } from "../Modal";
import { PlayerDraft } from "../DailyEntryView";
import React from "react";

const AddPlayerModal = ({
  playerDraft,
  setPlayerDraft,
  resetPlayerDraft,
  handleAddPlayer,
  saving,
  playerError,
  setPlayerError,
  handleGamerNumberLookup,
  playerLookupLoading,
  playerLookupMessage,
  setPlayerLookupMessage,
}: {
  playerDraft: PlayerDraft;
  setPlayerDraft: React.Dispatch<React.SetStateAction<PlayerDraft>>;
  resetPlayerDraft: () => void;
  handleAddPlayer: () => void;
  saving: boolean;
  playerError: string;
  setPlayerError: (value: string) => void;
  handleGamerNumberLookup: () => void;
  playerLookupLoading: boolean;
  playerLookupMessage: string;
  setPlayerLookupMessage: (value: string) => void;
}) => {
  return (
    <Modal onClose={resetPlayerDraft}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold">Register Player</h3>
        <button
          onClick={resetPlayerDraft}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={15} />
        </button>
      </div>

      <div className="space-y-4 mb-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
              First Name
            </label>
            <input
              value={playerDraft.firstName}
              onChange={(e) => {
                setPlayerDraft((p) => ({
                  ...p,
                  firstName: e.target.value,
                }));
                setPlayerError("");
              }}
              placeholder="First name"
              disabled={saving}
              className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
              Last Name
            </label>
            <input
              value={playerDraft.lastName}
              onChange={(e) => {
                setPlayerDraft((p) => ({
                  ...p,
                  lastName: e.target.value,
                }));
                setPlayerError("");
              }}
              placeholder="Last name"
              disabled={saving}
              className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
            Gamer Number (optional)
          </label>
          <div className="flex gap-2">
            <input
              value={playerDraft.gamerNumber}
              onChange={(e) => {
                setPlayerDraft((p) => ({
                  ...p,
                  gamerNumber: e.target.value,
                }));
                setPlayerLookupMessage("");
                setPlayerError("");
              }}
              onBlur={handleGamerNumberLookup}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleGamerNumberLookup();
                }
              }}
              placeholder="Auto-generated if empty"
              disabled={saving || playerLookupLoading}
              className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
            />

            <button
              type="button"
              onClick={handleGamerNumberLookup}
              disabled={
                saving || playerLookupLoading || !playerDraft.gamerNumber.trim()
              }
              className="h-9 px-3 bg-secondary border border-border rounded-sm text-xs text-foreground hover:bg-accent/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {playerLookupLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Search size={12} />
              )}
              Lookup
            </button>
          </div>

          {playerLookupMessage && (
            <p className="text-xs text-emerald-400 mt-1.5">
              {playerLookupMessage}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
            Phone (optional)
          </label>
          <input
            value={(() => {
              const digits = playerDraft.phone.replace(/\D/g, "").slice(0, 10);

              if (digits.length <= 3) return digits;
              if (digits.length <= 6)
                return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;

              return `(${digits.slice(0, 3)}) ${digits.slice(
                3,
                6
              )}-${digits.slice(6)}`;
            })()}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);

              setPlayerDraft((p) => ({
                ...p,
                phone: digits,
              }));
            }}
            placeholder="(787) 888-9890"
            disabled={saving}
            inputMode="numeric"
            autoComplete="tel"
            className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
          />
        </div>

        {playerError && (
          <p className="text-xs text-destructive">{playerError}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleAddPlayer}
          disabled={
            !playerDraft.firstName.trim() ||
            !playerDraft.lastName.trim() ||
            saving
          }
          className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          {playerLookupMessage ? "Record Transaction" : "Register Player"}
        </button>

        <button
          onClick={resetPlayerDraft}
          className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
};

export default AddPlayerModal;
