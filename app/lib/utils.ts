import type { Player, AlertStatus } from "./types";
import { WARNING_THRESHOLD, COMPLIANCE_THRESHOLD } from "./constants";

export function getPlayerTotals(player: Player) {
  const incoming = player.transactions
    .filter((t) => t.direction === "incoming")
    .reduce((sum, t) => sum + t.amount, 0);
  const outgoing = player.transactions
    .filter((t) => t.direction === "outgoing")
    .reduce((sum, t) => sum + t.amount, 0);
  return { incoming, outgoing };
}

export function getStatus(incoming: number, outgoing: number): AlertStatus {
  if (incoming >= COMPLIANCE_THRESHOLD || outgoing >= COMPLIANCE_THRESHOLD) return "compliance";
  if (incoming >= WARNING_THRESHOLD || outgoing >= WARNING_THRESHOLD) return "warning";
  return "normal";
}

export function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
