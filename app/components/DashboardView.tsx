"use client";
import { AlertTriangle, CalendarDays, CheckCircle } from "lucide-react";
import type { Player, Cashier } from "../lib/types";
import { TODAY } from "../lib/constants";
import { getPlayerTotals, getStatus, fmt, fmtDate } from "../lib/utils";
import { PlayerTable } from "./PlayerTable";

export function DashboardView({
  players,
  cashiers,
  selectedDate,
  setSelectedDate,
}: {
  players: Player[];
  cashiers: Cashier[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}) {
  const getCashierName = (value?: string) => {
    if (!value) return "—";

    const cashier = cashiers.find(
      (c) => c.id === value || c.name === value || c?.email === value
    );

    return cashier?.name || value;
  };

  const visiblePlayers = players.map((p) => {
    const createdByName = getCashierName(p.createdBy || p.cashierId);

    return {
      ...p,
      date: p.date?.includes("T") ? p.date.split("T")[0] : p.date,
      createdBy: createdByName,
      cashierId: createdByName,
      transactions: (p.transactions || []).map((t) => ({
        ...t,
        direction:
          t.direction === "outgoing"
            ? ("outgoing" as const)
            : ("incoming" as const),
        category: t.category || "Other",
        amount: Number(t.amount) || 0,
        timestamp: t.timestamp || "",
        cashierId: getCashierName(t.cashierId || p.createdBy || p.cashierId),
        cashierName: getCashierName(
          t.cashierName || t.cashierId || p.createdBy || p.cashierId
        ),
      })),
    };
  });

  const compliancePlayers = visiblePlayers.filter((p) => {
    const { incoming, outgoing } = getPlayerTotals(p);
    return getStatus(incoming, outgoing) === "compliance";
  });

  const warningPlayers = visiblePlayers.filter((p) => {
    const { incoming, outgoing } = getPlayerTotals(p);
    return getStatus(incoming, outgoing) === "warning";
  });

  const totalIn = visiblePlayers.reduce(
    (s, p) => s + getPlayerTotals(p).incoming,
    0
  );

  // const totalOut = visiblePlayers.reduce(
  //   (s, p) => s + getPlayerTotals(p).outgoing,
  //   0
  // );

  const totalTxns = visiblePlayers.reduce(
    (s, p) => s + (p.transactions?.length || 0),
    0
  );

  return (
    <div className="p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
            Dashboard Date
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            {fmtDate(selectedDate)}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            max={TODAY}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 px-3 bg-secondary border border-border rounded-sm text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/60"
          />
          <button
            type="button"
            onClick={() => setSelectedDate(TODAY)}
            disabled={selectedDate === TODAY}
            className="h-9 px-3 bg-secondary border border-border rounded-sm text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2"
          >
            <CalendarDays size={14} />
            Today
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Players",
            value: String(visiblePlayers.length),
            sub: "active records",
          },
          {
            label: "Transactions",
            value: String(totalTxns),
            sub: "total logged",
          },
          {
            label: "Total Cash In",
            value: fmt(totalIn),
            mono: true,
            sub: "cash in volume",
          },
          {
            label: "Alerts",
            value: String(compliancePlayers.length + warningPlayers.length),
            sub: `${compliancePlayers.length} compliance · ${warningPlayers.length} warning`,
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
              return (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded border border-emerald-500/15 bg-emerald-500/5 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {p.name}
                    </p>

                    {p.gamerNumber && (
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {p.gamerNumber}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {warningPlayers.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-500/25 rounded p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={13} className="text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 font-mono uppercase tracking-wider">
              Approaching Threshold — Monitor
            </span>
          </div>

          <div className="space-y-2">
            {warningPlayers.map((p) => {
              return (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded border border-amber-500/15 bg-amber-500/5 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {p.name}
                    </p>

                    {p.gamerNumber && (
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {p.gamerNumber}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-3">
          All Players {fmtDate(selectedDate)}
        </p>
        <PlayerTable players={visiblePlayers} cashiers={cashiers} showCashier />
      </div>
    </div>
  );
}
