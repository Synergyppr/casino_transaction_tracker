export type Role = "cashier" | "supervisor" | "manager";
export type Direction = "incoming" | "outgoing";
export type AlertStatus = "normal" | "warning" | "compliance";

export interface Cashier {
  id: string;
  name: string;
  pin: string;
  role: Role;
  active: boolean;
  employeeCode?: string;
  phone?: string;
}

export interface Transaction {
  id: string;
  direction: Direction;
  category: string;
  amount: number;
  timestamp: string;
  cashierId: string;
  playerId?: string;
  playerName?: string;
  cashierName?: string;
  status?: AlertStatus;
  referenceNumber?: string;
}

export interface Player {
  id: string;
  name: string;
  date: string;
  transactions: Transaction[];
  createdBy: string;
  gamerNumber?: string;
  phone?: string;
}

// === API Response Types (actual shapes from the live API) ===

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T | null;
}

export interface ApiCashier {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
  employeeCode: string | null;
  phone: string | null;
}

export interface ApiPlayer {
  id: string;
  gamerNumber: string;
  name: string;
  date: string;
  transactions: number; // count, not array
  createdBy: string | null;
  phone: string | null;
  active: boolean;
}

export interface ApiTransaction {
  id: string;
  direction: string;
  category: string;
  amount: number;
  cashierName: string;
  playerId: string;
  playerName: string;
  status: string;
  referenceNumber: string;
  notes: string | null;
  createdByCashierId: string;
  updatedByCashierId: string | null;
  lockedByCashierId: string | null;
  correctionOfTransactionId: string | null;
  correlationId: string;
}

export interface ApiDailyReport {
  businessDate: string;
  players: number;
  transactions: number;
  totalIncoming: number;
  totalOutgoing: number;
  net: number;
  complianceAlerts: number;
  playerDetail: ApiDailyReportPlayer[];
}

export interface ApiDailyReportPlayer {
  playerId: string;
  playerName: string;
  totalIncoming: number;
  totalOutgoing: number;
  transactionCount: number;
  status: string;
  transactions: ApiTransaction[];
}
