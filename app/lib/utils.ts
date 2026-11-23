import type { Player, AlertStatus, Cashier } from "./types";
import { WARNING_THRESHOLD, COMPLIANCE_THRESHOLD } from "./constants";

export const PROPERTY_EDIT_DENIED_MESSAGE =
  "You can only update transactions from your property.";

/**
 * Managers can edit any property's transactions; everyone else only those
 * belonging to the property they logged in with. Fails closed when either
 * property id is unknown.
 */
export function canEditTransactionProperty(
  user: Pick<Cashier, "role">,
  transactionPropertyId: string | undefined,
  sessionPropertyId: string | undefined
): boolean {
  if (user.role === "manager") return true;
  if (!transactionPropertyId || !sessionPropertyId) return false;
  return transactionPropertyId === sessionPropertyId;
}

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
