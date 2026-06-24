"use client";

import { AlertTriangle, CheckCircle } from "lucide-react";
import type { Player, Cashier } from "../lib/types";
import { WARNING_THRESHOLD, COMPLIANCE_THRESHOLD, TODAY } from "../lib/constants";
import { getPlayerTotals, getStatus, fmt, fmtDate } from "../lib/utils";
import { PlayerTable } from "./PlayerTable";

export function DashboardView({ players, cashiers }: { players: Player[]; cashiers: Cashier[] }) {
  const compliancePlayers = players.filter((p) => {
    const { incoming, outgoing } = getPlayerTotals(p);
    return getStatus(incoming, outgoing) === "compliance";
  });
  const warningPlayers = players.filter((p) => {
    const { incoming, outgoing } = getPlayerTotals(p);
    return getStatus(incoming, outgoing) === "warning";
  });

  const totalIn = players.reduce((s, p) => s + getPlayerTotals(p).incoming, 0);
  const totalOut = players.reduce((s, p) => s + getPlayerTotals(p).outgoing, 0);
  const totalTxns = players.reduce((s, p) => s + p.transactions.length, 0);
console.log("players", players);
  return (
    <div className="p-5 space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Players Today", value: String(players.length), sub: "active records" },
          { label: "Transactions", value: String(totalTxns), sub: "total logged" },
          { label: "Total Cash In", value: fmt(totalIn), mono: true, sub: "cash in volume" },
          {
            label: "Alerts",
            value: String(compliancePlayers.length + warningPlayers.length),
            sub: `${compliancePlayers.length} compliance \u00B7 ${warningPlayers.length} warning`,
            accent: compliancePlayers.length > 0 || warningPlayers.length > 0,
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`bg-card border rounded p-4 ${
              s.accent ? "border-amber-500/25" : "border-border"
            }`}
          >
            <p className="text-xs text-muted-foreground mb-1.5 font-mono uppercase tracking-wider">
              {s.label}
            </p>
            <p
              className={`text-2xl font-semibold ${s.mono ? "font-mono" : ""} ${
                s.accent ? "text-amber-400" : "text-foreground"
              }`}
            >
              {s.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Compliance banner */}
      {compliancePlayers.length > 0 && (
        <div className="bg-emerald-950/40 border border-emerald-500/25 rounded p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={13} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 font-mono uppercase tracking-wider">
              Compliance Documentation Required
            </span>
          </div>
          <div className="space-y-2">
            {compliancePlayers.map((p) => {
              const { incoming, outgoing } = getPlayerTotals(p);
              return (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-foreground">{p.name}</span>
                  <div className="flex items-center gap-5 font-mono text-xs">
                    <span>
                      <span className="text-muted-foreground">IN </span>
                      <span className={incoming >= COMPLIANCE_THRESHOLD ? "text-emerald-400" : "text-foreground"}>
                        {fmt(incoming)}
                      </span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">OUT </span>
                      <span className={outgoing >= COMPLIANCE_THRESHOLD ? "text-emerald-400" : "text-foreground"}>
                        {fmt(outgoing)}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Warning banner */}
      {warningPlayers.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-500/25 rounded p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={13} className="text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 font-mono uppercase tracking-wider">
              Approaching Threshold \u2014 Monitor
            </span>
          </div>
          <div className="space-y-2">
            {warningPlayers.map((p) => {
              const { incoming, outgoing } = getPlayerTotals(p);
              return (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-foreground">{p.name}</span>
                  <div className="flex items-center gap-5 font-mono text-xs">
                    <span>
                      <span className="text-muted-foreground">IN </span>
                      <span className={incoming >= WARNING_THRESHOLD ? "text-amber-400" : "text-foreground"}>
                        {fmt(incoming)}
                      </span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">OUT </span>
                      <span className={outgoing >= WARNING_THRESHOLD ? "text-amber-400" : "text-foreground"}>
                        {fmt(outgoing)}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Player table */}
      <div>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-3">
          All Players {fmtDate(TODAY)}
        </p>
        <PlayerTable players={players} cashiers={cashiers} showCashier />
      </div>
    </div>
  );
}
