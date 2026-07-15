import type {
  ApiResponse,
  ApiCashier,
  ApiPlayer,
  ApiTransaction,
  ApiDailyReport,
  Cashier,
  Player,
  Transaction,
  Role,
  Direction,
  AlertStatus,
  Logs,
} from "./types";

const BASE = "/api/CasinoPlayerTracking";

async function post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

// ─── Cashiers ──────────────────────────────────────────

export async function loginCashier(pin: string): Promise<Cashier> {
  const res = await post<ApiCashier>("/cashiers/login", { pin });
  if (res.status !== "200" || !res.data) {
    throw new Error(res.message || "Invalid PIN");
  }
  return mapCashier(res.data);
}

export async function getAllCashiers(): Promise<Cashier[]> {
  const res = await post<ApiCashier[]>("/cashiers/get-all");
  if (res.status !== "200" || !res.data) return [];
  return res.data.map(mapCashier);
}

export async function createCashierApi(data: {
  firstName: string;
  lastName: string;
  pin: string;
  role?: string;
  employeeCode?: string;
  phone?: string;
}): Promise<Cashier> {
  const res = await post<ApiCashier>("/cashiers/create", data);
  if (res.status !== "200" || !res.data)
    throw new Error(res.message || "Failed to create cashier");
  return mapCashier(res.data);
}

export async function updateCashierApi(data: {
  id: string;
  firstName?: string;
  lastName?: string;
  pin?: string;
  role?: string;
  employeeCode?: string;
  phone?: string;
  active?: boolean;
  updatedBy?: string;
}): Promise<void> {
  const res = await post<unknown>("/cashiers/update", data);
  if (res.status !== "200")
    throw new Error(res.message || "Failed to update cashier");
}

export async function deleteCashierApi(id: string): Promise<void> {
  const res = await post<unknown>("/cashiers/delete", { id });
  if (res.status !== "200")
    throw new Error(res.message || "Failed to delete cashier");
}

// ─── Players ───────────────────────────────────────────

export async function getAllPlayersApi(): Promise<ApiPlayer[]> {
  const res = await post<ApiPlayer[]>("/players/get-all");
  if (res.status !== "200" || !res.data) return [];

  // console.log("Fetched players:", res.data);
  return res.data;
}

export async function getPlayerByGamerNumber(
  gamerNumber: string
): Promise<ApiPlayer | null> {
  const res = await post<ApiPlayer>("/players/by-gamer-number", {
    gamerNumber,
  });
  if (res.status !== "200" || !res.data) return null;
  return res.data;
}

export async function createPlayerApi(data: {
  firstName: string;
  lastName: string;
  gamerNumber: string;
  phone?: string;
  createdBy?: string;
}): Promise<ApiPlayer> {
  const res = await post<ApiPlayer>("/players/create", data);
  if (res.status !== "200" || !res.data)
    throw new Error(res.message || "Failed to create player");
  return res.data;
}

export async function updatePlayerApi(data: {
  id: string;
  firstName?: string;
  lastName?: string;
  gamerNumber?: string;
  phone?: string;
}): Promise<void> {
  const res = await post<unknown>("/players/update", data);
  if (res.status !== "200")
    throw new Error(res.message || "Failed to update player");
}

// ─── Transactions ──────────────────────────────────────

export async function createTransactionApi(data: {
  playerId: string;
  createdByCashierId: string;
  direction: string;
  category: string;
  amount: number;
  notes?: string;
}): Promise<ApiTransaction> {
  const res = await post<ApiTransaction>("/transactions/create", data);
  if (res.status !== "200" || !res.data)
    throw new Error(res.message || "Failed to create transaction");
  return res.data;
}

export async function getTransactionById(id: string): Promise<ApiTransaction> {
  const res = await post<ApiTransaction>("/transactions/get-by-id", { id });
  if (res.status !== "200" || !res.data)
    throw new Error(res.message || "Transaction not found");
  return res.data;
}

export async function updateTransactionApi(data: {
  id: string;
  updatedByCashierId: string;
  direction?: string;
  category?: string;
  amount?: number;
  status?: string;
  notes?: string;
  reason?: string;
}): Promise<void> {
  // console.log("Updating transaction with data:", data);
  const res = await post<unknown>("/transactions/update", data);
  if (res.status !== "200")
    throw new Error(res.message || "Failed to update transaction");
}

export async function lockTransactionApi(transactionId: string): Promise<void> {
  const res = await post<unknown>("/transactions/lock", { transactionId });
  if (res.status !== "200")
    throw new Error(res.message || "Failed to lock transaction");
}

// ─── Daily Report ──────────────────────────────────────

export async function getDailyReport(
  startDateTime: string,
  endDateTime: string 
): Promise<ApiDailyReport | null> {
  console.log("Fetching daily report for business date:", startDateTime);
  const res = await post<ApiDailyReport>("/GetDailyReportByBusinessDate", {
    startDateTime,
    endDateTime,
  });
  if (res.status !== "200" || !res.data) return null;

  console.log("Fetched daily report:", res.data);
  return res.data;
}

// ─── Transaction Logs ──────────────────────────────────────
export async function getTransactionLogs(
  transactionId: string
): Promise<Logs[]> {
  const res = await post<Logs[]>("/transactions/logs", { transactionId });
  if (res.status !== "200" || !res.data) return [];
  return res.data;
}

// ─── Mappers ───────────────────────────────────────────

function mapCashier(api: ApiCashier): Cashier {
  const validRoles: Role[] = ["cashier", "supervisor", "manager"];
  const role: Role = validRoles.includes(api.role as Role)
    ? (api.role as Role)
    : "cashier";
  return {
    id: api.id,
    name: [api.firstName, api.lastName].filter(Boolean).join(" ") || "Unknown",
    pin: "",
    role,
    active: api.active,
    employeeCode: api.employeeCode || undefined,
    phone: api.phone || undefined,
  };
}

export function mapApiTransaction(api: ApiTransaction): Transaction {
  return {
    id: api.id,
    direction: (api.direction === "outgoing"
      ? "outgoing"
      : "incoming") as Direction,
    category: api.category || "Other",
    amount: api.amount,
    timestamp: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    cashierId: api.createdByCashierId || "",
    playerId: api.playerId,
    playerName: api.playerName,
    cashierName: api.cashierName,
    status: api.status as AlertStatus,
    referenceNumber: api.referenceNumber,
  };
}

export function mapApiPlayer(
  api: ApiPlayer,
  transactions: Transaction[] = []
): Player {
  return {
    id: api.id,
    name: api.name || "Unknown",
    date: api.date
      ? api.date.split("T")[0]
      : new Date().toISOString().split("T")[0],
    transactions,
    createdBy: api.createdBy || "",
    gamerNumber: api.gamerNumber,
    phone: api.phone || undefined,
  };
}
