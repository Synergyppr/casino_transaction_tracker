export type Role = "cashier" | "supervisor" | "manager";
export type Direction = "incoming" | "outgoing";
export type AlertStatus = "normal" | "warning" | "compliance";

export interface CreateCashier {
  propertyIds?: string[];
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
  name: string;
  propertyIds?: string[];
  id: string;
  firstName: string;
  lastName: string; 
  pin: string;
  role: Role;
  active: boolean;
  employeeCode?: string;
  phone?: string;
  email?: string;
}

export interface Transaction {
  notes?: string | null;
  id: string;
  direction: Direction;
  category: string;
  amount: number;
  cashierId: string;
  playerId?: string;
  playerName?: string;
  cashierName?: string;
  status?: string;
  referenceNumber?: string;
  date?: string;
}

export interface CreatePlayer {
  race?: string;
  gender?: string;
  age?: string;
  build?: string;
  description?: string;
  refused?: boolean;
  gamerNumber?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdBy?: string;
}

export interface Player {
  firstName?: string;
  lastName?: string;
  active?: boolean;
  race?: string | null;
  gender?: string | null;
  age?: string | null;
  build?: string | null;
  description?: string | null;
  refused?: boolean | null;
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
  propertyIds?: string[];
  properties?: {id: string; name?: string}[];
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
  employeeCode: string | null;
  phone: string | null;
}

export interface ApiPlayer {
  firstName?: string | null;
  lastName?: string | null;
  race?: string | null;
  gender?: string | null;
  age?: string | null;
  build?: string | null;
  description?: string | null;
  refused?: boolean | null;
  status?: string;
  totalTransactions?: number;
  totalCashIn?: number;
  totalCashOut?: number;
  id: string;
  gamerNumber: string;
  name: string;
  date: string;
  transactions: ApiTransactionSummary[];
  createdBy: string | null;
  phone: string | null;
  active: boolean;
  direction?: string | null;
}

// Create Transaction Request
export interface ApiTransactionSummary {
  createdBy?: string;
  id: string;
  direction: string;
  category: string;
  amount: number;
  date?: string;
  cashierName?: string;
  playerId?: string;
  playerName?: string;
  status?: string;
  referenceNumber?: string;
  notes?: string | null;
  createdByCashierId?: string;
}

export interface ApiTransaction extends ApiTransactionSummary {
  propertyId?: string;
  transactionAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lockedAt?: string | null;
  archivedAt?: string | null;
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
  createdBy?: string;
  date?: string;
}

export interface ApiDailyReport {
  businessDate?: string;
  players: number;
  transactions: number;
  totalIncoming: number;
  totalOutgoing: number;
  net: number;
  complianceAlerts: number;
  playerDetail: ApiDailyReportPlayer[];
  createdBy?: string;
}

export interface ApiDailyReportPlayer {
  playerId: string;
  player: string;
  playerName?: string;
  firstName?: string;
  lastName?: string;
  incoming: number;
  outgoing: number;
  net: number;
  totalIncoming?: number;
  totalOutgoing?: number;
  transactionCount?: number;
  status: string;
  transactions: ApiTransactionSummary[];
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

export interface LoginCashierRequest {
  pin: string;
  propertyId: string;
}

export interface UpdateCashierRequest extends Partial<CreateCashier> {
  id: string;
  email?: string;
  updatedBy?: string;
}

export interface UpdatePlayerRequest extends Partial<CreatePlayer> {
  id: string;
  active?: boolean;
  updatedBy?: string;
}

export interface DeleteRecordRequest {
  id: string;
  deletedBy: string;
  reason: string;
}

export interface CreateTransactionRequest {
  playerId: string;
  propertyId: string;
  createdByCashierId: string;
  direction: string;
  category: string;
  amount: number;
  notes?: string;
}

export interface UpdateTransactionRequest extends Partial<Pick<CreateTransactionRequest, "direction" | "category" | "amount" | "notes">> {
  id: string;
  updatedByCashierId: string;
  status?: string;
  reason?: string;
}

export interface LockTransactionRequest {
  id: string;
  lockedByCashierId: string;
  reason: string;
}

export interface DailyReportRequest {
  propertyId: string;
  startDateTime: string;
  endDateTime: string;
  direction?: string;
  status?: string;
}
