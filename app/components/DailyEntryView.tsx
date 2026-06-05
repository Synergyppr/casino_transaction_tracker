"use client";

import { useState } from "react";
import {
  Search,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
} from "lucide-react";
import type { Cashier, Direction, Player, Transaction } from "../lib/types";
import { CASH_IN_TYPES, CASH_OUT_TYPES, TODAY } from "../lib/constants";
import { getPlayerTotals, getStatus, fmt } from "../lib/utils";
import { StatusBadge } from "./StatusBadge";
import { AmtCell } from "./AmtCell";
import { Modal } from "./Modal";

interface TxnDraft {
  playerId: string;
  playerName: string;
  direction: Direction;
  category: string;
  amount: string;
}

export function DailyEntryView({
  players,
  setPlayers,
  user,
}: {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  user: Cashier;
}) {
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [dupModal, setDupModal] = useState<{ name: string; matches: Player[] } | null>(null);
  const [txnModal, setTxnModal] = useState<TxnDraft | null>(null);
  const [txnError, setTxnError] = useState("");

  const todayPlayers = players.filter((p) => p.date === TODAY);
  const displayed = search
    ? todayPlayers.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : todayPlayers;

  function handleAddPlayer() {
    const name = newName.trim();
    if (!name) return;
    const matches = todayPlayers.filter(
      (p) =>
        p.name.toLowerCase().includes(name.slice(0, 5).toLowerCase()) ||
        name.toLowerCase().includes(p.name.slice(0, 5).toLowerCase())
    );
    if (matches.length > 0) {
      setDupModal({ name, matches });
    } else {
      createPlayer(name);
    }
  }

  function createPlayer(name: string) {
    const p: Player = {
      id: `p${Date.now()}`,
      name,
      date: TODAY,
      transactions: [],
      createdBy: user.id,
    };
    setPlayers((prev) => [...prev, p]);
    setNewName("");
    setDupModal(null);
    openTxn(p);
  }

  function openTxn(p: Player) {
    setTxnModal({
      playerId: p.id,
      playerName: p.name,
      direction: "incoming",
      category: CASH_IN_TYPES[0],
      amount: "",
    });
    setTxnError("");
  }

  function submitTxn() {
    if (!txnModal) return;
    const amt = parseFloat(txnModal.amount);
    if (!amt || amt <= 0) {
      setTxnError("Enter a valid positive amount.");
      return;
    }
    const txn: Transaction = {
      id: `t${Date.now()}`,
      direction: txnModal.direction,
      category: txnModal.category,
      amount: amt,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      cashierId: user.id,
    };
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === txnModal.playerId ? { ...p, transactions: [...p.transactions, txn] } : p
      )
    );
    setTxnModal(null);
    setTxnError("");
  }

  return (
    <div className="p-5">
      {/* Add player bar */}
      <div className="mb-5 p-4 bg-card border border-border rounded">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-3">
          Register Player
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
            placeholder="Full player name..."
            className="flex-1 h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
          />
          <button
            onClick={handleAddPlayer}
            disabled={!newName.trim()}
            className="px-5 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add Player
          </button>
        </div>
      </div>

      {/* Search + count */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
          Today&apos;s Players
          <span className="ml-2 text-foreground">{todayPlayers.length}</span>
        </p>
        <div className="sm:ml-auto flex items-center gap-2 h-8 px-3 bg-secondary border border-border rounded-sm w-full sm:w-52">
          <Search size={12} className="text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Players table */}
      <div className="bg-card border border-border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Player</th>
              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Cash In</th>
              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Cash Out</th>
              <th className="text-center px-4 py-2.5 text-xs text-muted-foreground font-medium">Status</th>
              <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                  {search ? "No matching players." : "No players for today. Register one above."}
                </td>
              </tr>
            ) : (
              displayed.map((p, i) => {
                const { incoming, outgoing } = getPlayerTotals(p);
                const status = getStatus(incoming, outgoing);
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border last:border-0 ${
                      status === "compliance"
                        ? "bg-emerald-500/5"
                        : status === "warning"
                        ? "bg-amber-500/5"
                        : i % 2 === 1
                        ? "bg-secondary/20"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold">{p.name}</td>
                    <td className="px-4 py-3 text-right">
                      <AmtCell amount={incoming} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AmtCell amount={outgoing} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openTxn(p)}
                        className="px-3 py-1 text-xs bg-secondary hover:bg-accent/20 border border-border rounded-sm transition-colors text-foreground"
                      >
                        + Transaction
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Duplicate modal */}
      {dupModal && (
        <Modal onClose={() => setDupModal(null)}>
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold">Possible Duplicate Player</h3>
              <p className="text-xs text-muted-foreground mt-1">
                A similar name already exists for today. How would you like to proceed?
              </p>
            </div>
          </div>
          <div className="bg-secondary border border-border rounded-sm p-3 mb-4 space-y-2">
            {dupModal.matches.map((m) => {
              const { incoming, outgoing } = getPlayerTotals(m);
              return (
                <div key={m.id} className="flex items-center justify-between text-xs">
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
                openTxn(dupModal.matches[0]);
                setDupModal(null);
                setNewName("");
              }}
              className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors"
            >
              Use Existing Record
            </button>
            <button
              onClick={() => createPlayer(dupModal.name)}
              className="flex-1 h-9 bg-secondary border border-border rounded-sm text-sm text-foreground hover:bg-accent/10 transition-colors"
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
      )}

      {/* Add transaction modal */}
      {txnModal && (
        <Modal onClose={() => { setTxnModal(null); setTxnError(""); }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold">Add Transaction</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{txnModal.playerName}</p>
            </div>
            <button
              onClick={() => setTxnModal(null)}
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
                            category: dir === "incoming" ? CASH_IN_TYPES[0] : CASH_OUT_TYPES[0],
                          }
                        : prev
                    )
                  }
                  className={`flex-1 h-9 rounded-sm text-sm flex items-center justify-center gap-2 transition-colors border ${
                    txnModal.direction === dir
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
              value={txnModal.category}
              onChange={(e) =>
                setTxnModal((prev) => (prev ? { ...prev, category: e.target.value } : prev))
              }
              className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
            >
              {(txnModal.direction === "incoming" ? CASH_IN_TYPES : CASH_OUT_TYPES).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="mb-5">
            <label className="text-xs text-muted-foreground mb-1.5 block font-mono uppercase tracking-wider">
              Amount (USD)
            </label>
            <input
              type="number"
              value={txnModal.amount}
              onChange={(e) =>
                setTxnModal((prev) => (prev ? { ...prev, amount: e.target.value } : prev))
              }
              onKeyDown={(e) => e.key === "Enter" && submitTxn()}
              placeholder="0"
              className="w-full h-9 px-3 bg-secondary border border-border rounded-sm text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
              min="0"
              step="1"
              autoFocus
            />
            {txnError && <p className="text-xs text-destructive mt-1.5">{txnError}</p>}
          </div>

          <div className="flex gap-2">
            <button
              onClick={submitTxn}
              className="flex-1 h-9 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/85 transition-colors"
            >
              Record Transaction
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
      )}
    </div>
  );
}
