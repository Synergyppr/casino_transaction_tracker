import type { Cashier, Player } from "./types";

export const WARNING_THRESHOLD = 7500;
export const COMPLIANCE_THRESHOLD = 10000;

export const CASH_IN_TYPES = [
  "Deposit(s)",
  "Payment(s)",
  "Currency received for funds transfer(s) out",
  "Purchase of negotiable instrument(s)",
  "Currency exchange(s)",
  "Currency to prepaid access",
  "Purchases of casino chips, tokens and other gaming instruments",
  "Currency wager(s) including money plays",
  "Bills inserted into gaming devices",
  "Other (specify)",
];

export const CASH_OUT_TYPES = [
  "Withdrawal(s)",
  "Advance(s) on credit (including markers)",
  "Currency paid from funds transfer(s) in",
  "Negotiable instrument(s) cashed",
  "Currency exchange(s)",
  "Currency from prepaid access",
  "Redemption(s) of casino chips, tokens, TITO tickets and other gaming instruments",
  "Payment(s) on wager(s) (including race and OTB or sports pool)",
  "Travel and complimentary expenses and book gaming incentives",
  "Payment for tournament, contest or other promotions",
  "Debit card",
  "Other (specify)",
];

export const SEED_CASHIERS: Cashier[] = [
  { id: "c1", name: "Maria Santos", pin: "1234", role: "cashier", active: true },
  { id: "c2", name: "Carlos Reyes", pin: "5678", role: "cashier", active: true },
  { id: "c3", name: "Ana Lopez", pin: "9012", role: "cashier", active: true },
  { id: "c4", name: "David Torres", pin: "0000", role: "supervisor", active: true },
  { id: "c5", name: "Sandra Vega", pin: "1111", role: "manager", active: true },
];

export const TODAY = new Date().toISOString().split("T")[0];

export function getSeedPlayers(): Player[] {
  return [
    {
      id: "p1",
      name: "James Whitfield",
      date: TODAY,
      createdBy: "c1",
      transactions: [
        { id: "t1", direction: "incoming", category: "Purchases of casino chips, tokens and other gaming instruments", amount: 5000, timestamp: "09:12", cashierId: "c1" },
        { id: "t2", direction: "incoming", category: "Currency wager(s) including money plays", amount: 3200, timestamp: "10:45", cashierId: "c2" },
      ],
    },
    {
      id: "p2",
      name: "Elena Marchetti",
      date: TODAY,
      createdBy: "c2",
      transactions: [
        { id: "t3", direction: "incoming", category: "Purchases of casino chips, tokens and other gaming instruments", amount: 10500, timestamp: "11:30", cashierId: "c2" },
      ],
    },
    {
      id: "p3",
      name: "Robert Kim",
      date: TODAY,
      createdBy: "c1",
      transactions: [
        { id: "t4", direction: "outgoing", category: "Withdrawal(s)", amount: 8200, timestamp: "12:05", cashierId: "c1" },
      ],
    },
    {
      id: "p4",
      name: "Sofia Delgado",
      date: TODAY,
      createdBy: "c3",
      transactions: [
        { id: "t5", direction: "incoming", category: "Deposit(s)", amount: 2000, timestamp: "13:20", cashierId: "c3" },
        { id: "t6", direction: "outgoing", category: "Redemption(s) of casino chips, tokens, TITO tickets and other gaming instruments", amount: 1500, timestamp: "14:10", cashierId: "c3" },
      ],
    },
    {
      id: "p5",
      name: "Marcus Chen",
      date: TODAY,
      createdBy: "c4",
      transactions: [
        { id: "t7", direction: "incoming", category: "Currency wager(s) including money plays", amount: 7500, timestamp: "15:00", cashierId: "c4" },
      ],
    },
  ];
}
