export type Role = "cashier" | "supervisor" | "manager";
export type Direction = "incoming" | "outgoing";
export type AlertStatus = "normal" | "warning" | "compliance";

export interface CreateCashier {
  firstName: string;
  lastName: string;
  employeeCode?: string;
  phone?: string;
  pin?: string;
  role?: Role;
  active?: boolean;
  createdBy?: string;
}

export interface Cashier {
  id: string;
  name: string;
  pin: string;
  role: Role;
  active: boolean;
  employeeCode?: string;
  phone?: string;
  email?: string;
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

export interface CreatePlayer {
  gamerNumber?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdBy?: string;
}

export interface Player {
  id: string;
  name: string;
  date: string;
  transactions: Transaction[];
  createdBy: string;
  gamerNumber?: string;
  phone?: string;
  cashierId?: string;
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
  transactions: ApiTransaction[];
  createdBy: string | null;
  phone: string | null;
  active: boolean;
  direction?: string | null;
  timestamp?: string | null;
}

// Create Transaction Request
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
  timestamp?: string;
  createdBy?: string;
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
  createdBy: string;
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

// ---------------   Admin View   ---------------

export interface EditDraft {
  id: string;
  firstName: string;
  lastName: string;
  pin: string;
  role: Role;
  employeeCode: string;
  phone: string;
  active: boolean;
}

// ---------------  Logs  ---------------

export interface Logs {
  id: number;
  transactionId: string;
  action: string;
  oldValuesJson: string;
  newValuesJson: string;
  reason: string;
  changedByCashierId: string;
  createdAtUtc: string;
}
