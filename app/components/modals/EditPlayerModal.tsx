"use client";
import type { Dispatch, SetStateAction } from "react";
import { AlertTriangle, FileEditIcon, Loader2, X } from "lucide-react";
import { Modal } from "../Modal";

export interface EditPlayerDraft {
  id: string;
  gamerNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  active: boolean;
}

interface EditPlayerModalProps {
  playerDraft: EditPlayerDraft;
  setPlayerDraft: Dispatch<SetStateAction<EditPlayerDraft | null>>;
  saving: boolean;
  error: string;
  setError: Dispatch<SetStateAction<string>>;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export default function EditPlayerModal({
  playerDraft,
  setPlayerDraft,
  saving,
  error,
  setError,
  onClose,
  onSubmit,
}: EditPlayerModalProps) {
  function updateField<K extends keyof EditPlayerDraft>(
    field: K,
    value: EditPlayerDraft[K]
  ) {
    setPlayerDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            [field]: value,
          }
        : currentDraft
    );

    if (error) setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit();
  }

  return (
    <Modal onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border bg-secondary/35 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-accent/20 bg-accent/10 text-accent">
              <FileEditIcon size={17} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground">
                Edit Player
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Update the player&apos;s profile and account status.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close edit player modal"
            className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              First name
            </span>
            <input
              autoFocus
              value={playerDraft.firstName}
              onChange={(event) =>
                updateField("firstName", event.target.value)
              }
              disabled={saving}
              placeholder="First name"
              className="h-10 w-full rounded-sm border border-border bg-secondary/40 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Last name
            </span>
            <input
              value={playerDraft.lastName}
              onChange={(event) =>
                updateField("lastName", event.target.value)
              }
              disabled={saving}
              placeholder="Last name"
              className="h-10 w-full rounded-sm border border-border bg-secondary/40 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Gamer number
            </span>
            <input
              value={playerDraft.gamerNumber}
              onChange={(event) =>
                updateField("gamerNumber", event.target.value)
              }
              disabled={saving}
              placeholder="Gamer number"
              className="h-10 w-full rounded-sm border border-border bg-secondary/40 px-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Phone
            </span>
            <input
              type="tel"
              value={playerDraft.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              disabled={saving}
              placeholder="Phone number"
              className="h-10 w-full rounded-sm border border-border bg-secondary/40 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="button"
              role="switch"
              aria-checked={playerDraft.active}
              onClick={() => updateField("active", !playerDraft.active)}
              disabled={saving}
              className="flex w-full items-center justify-between rounded-sm border border-border bg-secondary/25 px-3 py-3 text-left transition-colors hover:bg-secondary/45 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>
                <span className="block text-sm font-medium text-foreground">
                  Player account
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {playerDraft.active
                    ? "The player is active and available for transactions."
                    : "The player is inactive and unavailable for new activity."}
                </span>
              </span>

              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  playerDraft.active ? "bg-accent" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    playerDraft.active ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </span>
            </button>
          </div>

          {error && (
            <div className="sm:col-span-2 flex items-start gap-2 rounded-sm border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-secondary/20 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-9 rounded-sm border border-border bg-secondary px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-sm bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FileEditIcon size={14} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
