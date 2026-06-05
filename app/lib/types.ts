export type Role = "cashier" | "supervisor" | "manager";
export type Direction = "incoming" | "outgoing";
export type AlertStatus = "normal" | "warning" | "compliance";

export interface Cashier {
  id: string;
  name: string;
  pin: string;
  role: Role;
  active: boolean;
}

export interface Transaction {
  id: string;
  direction: Direction;
  category: string;
  amount: number;
  timestamp: string;
  cashierId: string;
}

export interface Player {
  id: string;
  name: string;
  date: string;
  transactions: Transaction[];
  createdBy: string;
}
