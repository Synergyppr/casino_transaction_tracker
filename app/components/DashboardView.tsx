"use client";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Player, Cashier } from "../lib/types";
import { getPlayerTotals, getStatus, fmt, fmtDate } from "../lib/utils";
import { PlayerTable } from "./PlayerTable";

const PLAYERS_PER_PAGE = 5;

function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  label = "players",
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  if (totalItems <= pageSize) return null;

  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-2 border-t border-current/10 pt-3 mt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] text-muted-foreground font-mono">
        Showing {firstItem}–{lastItem} of {totalItems} {label}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-sm border border-border bg-secondary px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          aria-label="Previous page"
        >
          <ChevronLeft size={13} />
          Previous
        </button>

        <span className="min-w-18.5 text-center text-[11px] text-muted-foreground font-mono">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-sm border border-border bg-secondary px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          aria-label="Next page"
        >
          Next
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

export function DashboardView({
  players,
  cashiers,
  selectedDate,
}: {
  players: Player[];
  cashiers: Cashier[];
  selectedDate: string;
}) {
  const [pagination, setPagination] = useState({
    selectedDate,
    compliancePage: 1,
    warningPage: 1,
    playersPage: 1,
  });

  const paginationForSelectedDate =
    pagination.selectedDate === selectedDate
      ? pagination
      : {
          selectedDate,
          compliancePage: 1,
          warningPage: 1,
          playersPage: 1,
        };

  const getCashierName = (value?: string) => {
    if (!value) return "—";

    const cashier = cashiers.find(
      (c) => c.id === value || c.name === value || c?.email === value
    );

    return cashier?.name || value;
  };

  const visiblePlayers = useMemo(
    () =>
      players.map((p) => {
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
            cashierId: getCashierName(
              t.cashierId || p.createdBy || p.cashierId
            ),
            cashierName: getCashierName(
              t.cashierName || t.cashierId || p.createdBy || p.cashierId
            ),
          })),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [players, cashiers]
  );

  const compliancePlayers = useMemo(
    () =>
      visiblePlayers.filter((p) => {
        const { incoming, outgoing } = getPlayerTotals(p);
        return getStatus(incoming, outgoing) === "compliance";
      }),
    [visiblePlayers]
  );

  const warningPlayers = useMemo(
    () =>
      visiblePlayers.filter((p) => {
        const { incoming, outgoing } = getPlayerTotals(p);
        return getStatus(incoming, outgoing) === "warning";
      }),
    [visiblePlayers]
  );

  const complianceTotalPages = Math.max(
    1,
    Math.ceil(compliancePlayers.length / PLAYERS_PER_PAGE)
  );

  const warningTotalPages = Math.max(
    1,
    Math.ceil(warningPlayers.length / PLAYERS_PER_PAGE)
  );

  const playersTotalPages = Math.max(
    1,
    Math.ceil(visiblePlayers.length / PLAYERS_PER_PAGE)
  );

  const compliancePage = Math.min(
    Math.max(paginationForSelectedDate.compliancePage, 1),
    complianceTotalPages
  );

  const warningPage = Math.min(
    Math.max(paginationForSelectedDate.warningPage, 1),
    warningTotalPages
  );

  const playersPage = Math.min(
    Math.max(paginationForSelectedDate.playersPage, 1),
    playersTotalPages
  );

  const paginatedCompliancePlayers = useMemo(() => {
    const startIndex = (compliancePage - 1) * PLAYERS_PER_PAGE;

    return compliancePlayers.slice(startIndex, startIndex + PLAYERS_PER_PAGE);
  }, [compliancePlayers, compliancePage]);

  const paginatedWarningPlayers = useMemo(() => {
    const startIndex = (warningPage - 1) * PLAYERS_PER_PAGE;

    return warningPlayers.slice(startIndex, startIndex + PLAYERS_PER_PAGE);
  }, [warningPlayers, warningPage]);

  function handleCompliancePageChange(page: number) {
    setPagination((current) => ({
      selectedDate,
      compliancePage: Math.min(Math.max(page, 1), complianceTotalPages),
      warningPage:
        current.selectedDate === selectedDate ? current.warningPage : 1,
      playersPage:
        current.selectedDate === selectedDate ? current.playersPage : 1,
    }));
  }

  function handleWarningPageChange(page: number) {
    setPagination((current) => ({
      selectedDate,
      compliancePage:
        current.selectedDate === selectedDate ? current.compliancePage : 1,
      warningPage: Math.min(Math.max(page, 1), warningTotalPages),
      playersPage:
        current.selectedDate === selectedDate ? current.playersPage : 1,
    }));
  }

  function handlePlayersPageChange(page: number) {
    setPagination((current) => ({
      selectedDate,
      compliancePage:
        current.selectedDate === selectedDate ? current.compliancePage : 1,
      warningPage:
        current.selectedDate === selectedDate ? current.warningPage : 1,
      playersPage: Math.min(Math.max(page, 1), playersTotalPages),
    }));
  }

  const totalIn = visiblePlayers.reduce(
    (s, p) => s + getPlayerTotals(p).incoming,
    0
  );

  const totalOut = visiblePlayers.reduce(
    (s, p) => s + getPlayerTotals(p).outgoing,
    0
  );

  const totalTxns = visiblePlayers.reduce(
    (s, p) => s + (p.transactions?.length || 0),
    0
  );

  return (
    <div className="p-5 space-y-5">
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
            label: "Cash Flow",
            value: fmt(totalIn),
            mono: true,
            sub: `IN ${fmt(totalIn)} · OUT ${fmt(totalOut)}`,
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
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={13} className="text-emerald-400" />

              <span className="text-xs font-semibold text-emerald-400 font-mono uppercase tracking-wider">
                Compliance Documentation Required
              </span>
            </div>

            <span className="text-[11px] text-emerald-400/80 font-mono">
              {compliancePlayers.length}{" "}
              {compliancePlayers.length === 1 ? "player" : "players"}
            </span>
          </div>

          <div className="space-y-2">
            {paginatedCompliancePlayers.map((p) => {
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

          <PaginationControls
            currentPage={compliancePage}
            totalPages={complianceTotalPages}
            totalItems={compliancePlayers.length}
            pageSize={PLAYERS_PER_PAGE}
            onPageChange={handleCompliancePageChange}
          />
        </div>
      )}

      {warningPlayers.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-500/25 rounded p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-amber-400" />

              <span className="text-xs font-semibold text-amber-400 font-mono uppercase tracking-wider">
                Approaching Threshold — Monitor
              </span>
            </div>

            <span className="text-[11px] text-amber-400/80 font-mono">
              {warningPlayers.length}{" "}
              {warningPlayers.length === 1 ? "player" : "players"}
            </span>
          </div>

          <div className="space-y-2">
            {paginatedWarningPlayers.map((p) => {
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

          <PaginationControls
            currentPage={warningPage}
            totalPages={warningTotalPages}
            totalItems={warningPlayers.length}
            pageSize={PLAYERS_PER_PAGE}
            onPageChange={handleWarningPageChange}
          />
        </div>
      )}

      <div>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-3">
          All Players {fmtDate(selectedDate)}
        </p>

        <PlayerTable
          players={visiblePlayers}
          cashiers={cashiers}
          showCashier
          page={playersPage}
          pageSize={10}
          onPageChange={handlePlayersPageChange}
        />
      </div>
    </div>
  );
}
