import { Loader2, Search, X } from "lucide-react";
import { Modal } from "../Modal";
import { PlayerDraft } from "../DailyEntryView";
import React from "react";
import type { ApiPlayer, Player } from "../../lib/types";
import { formatPhoneNumber } from "../../lib/formatPhone";

const AddPlayerModal = ({
  nameQuery,
  onNameQueryChange,
  onNameLookup,
  nameMatches,
  nameSearched,
  onSelectPlayer,
  selectedPlayer,
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
  nameQuery: string;
  onNameQueryChange: (value: string) => void;
  onNameLookup: () => void;
  nameMatches: ApiPlayer[];
  nameSearched: boolean;
  onSelectPlayer: (player: ApiPlayer) => void;
  selectedPlayer: Player | null;
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
    <Modal onEscape={resetPlayerDraft}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold">Register Player</h3>
        <button
          onClick={resetPlayerDraft}
          disabled={saving}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={15} />
        </button>
      </div>

      <div className="space-y-4 mb-5">
        <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-3">
          <label htmlFor="player-name-lookup" className="block text-xs font-medium">
            Find an existing player by name
          </label>
          <div className="flex gap-2">
            <input
              id="player-name-lookup"
              value={nameQuery}
              onChange={(e) => onNameQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onNameLookup();
                }
              }}
              placeholder="Enter full name"
              disabled={saving || playerLookupLoading}
              className="min-w-0 flex-1 h-9 rounded-sm border border-border bg-secondary px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent/60"
            />
            <button
              type="button"
              onClick={onNameLookup}
              disabled={saving || playerLookupLoading || !nameQuery.trim()}
              className="inline-flex items-center gap-1.5 rounded-sm bg-accent px-3 text-xs text-white disabled:opacity-50"
            >
              {playerLookupLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              Search
            </button>
          </div>
          <div aria-live="polite">
            {nameSearched && nameMatches.length === 0 && (
              <p className="text-xs text-muted-foreground">No players found. You can register a new player below.</p>
            )}
            {nameMatches.length > 0 && (
              <div className="max-h-56 overflow-y-auto space-y-2">
                <p className="text-xs text-muted-foreground">Choose the correct player ({nameMatches.length} results).</p>
                {nameMatches.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => onSelectPlayer(player)}
                    disabled={saving || playerLookupLoading}
                    className="w-full rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{player.name || `${player.firstName || ""} ${player.lastName || ""}`}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${player.active ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                        {player.active ? "Active" : "Register again"}
                      </span>
                    </span>
                    <span className="mt-1 block break-all text-xs text-muted-foreground">
                      {player.gamerNumber || "No player number"} · {formatPhoneNumber(player.phone || "")}
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">Last registration: {player.date || "Unavailable"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
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
              disabled={saving || playerLookupLoading || !!selectedPlayer}
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
              disabled={saving || playerLookupLoading || !!selectedPlayer}
              className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
          Player Number (optional)
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
              disabled={saving || playerLookupLoading || !!selectedPlayer}
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
            disabled={saving || playerLookupLoading || !!selectedPlayer}
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
            saving || playerLookupLoading
          }
          className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          {selectedPlayer
            ? selectedPlayer.active === false
              ? "Register & Add Transaction"
              : "Add Transaction"
            : "Register & Add Transaction"}
        </button>

        <button
          onClick={resetPlayerDraft}
          disabled={saving}
          className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
};

export default AddPlayerModal;
