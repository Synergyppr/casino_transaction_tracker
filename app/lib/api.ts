import { capitalizePropertyName } from "./propertyName";
import type {
  ApiResponse,
  ApiCashier,
  ApiPlayer,
  ApiTransaction,
  ApiTransactionSummary,
  CreatePlayer,
  CreateCashier,
  UpdateCashierRequest,
  UpdatePlayerRequest,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  LockTransactionRequest,
  DailyReportRequest,
  DeleteRecordRequest,
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

async function post<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    signal,
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

export async function loginCashier(
  pin: string,
  propertyId: string
): Promise<Cashier> {
  const res = await post<ApiCashier>(
    "/cashiers/login",
    { pin, propertyId },
    AbortSignal.timeout(20_000)
  );
  if (res.status !== "200" || !res.data) {
    throw new Error(res.message || "Invalid PIN");
  }
  return mapCashier(res.data);
}

export async function getAllCashiers(): Promise<Cashier[]> {
  const res = await post<ApiCashier[]>("/cashiers/get-all");
  if (res.status !== "200" || !res.data)
    throw new Error(res.message || "Failed to load records");
  return res.data.map(mapCashier);
}

export async function getCashiersByPropertyId(
  id: string
): Promise<Cashier[]> {
  const res = await post<ApiCashier[]>("/GetCashiersByProperty", { id });
  if (res.status !== "200" || !res.data)
    throw new Error(res.message || "Failed to load cashiers");
  return res.data.map(mapCashier);
}

export async function createCashierApi(data: CreateCashier): Promise<Cashier> {
  const res = await post<ApiCashier>("/cashiers/create", data);
  if (res.status !== "200" || !res.data)
    throw new Error(res.message || "Failed to create cashier");
  return mapCashier(res.data);
}

export async function updateCashierApi(data: UpdateCashierRequest): Promise<void> {
  const res = await post<unknown>("/cashiers/update", data);
  if (res.status !== "200")
    throw new Error(res.message || "Failed to update cashier");
}

export async function deleteCashierApi(data: DeleteRecordRequest): Promise<void> {
  const res = await post<unknown>("/cashiers/delete", data);
  if (res.status !== "200")
    throw new Error(res.message || "Failed to delete cashier");
}

// ─── Properties ───────────────────────────────────────────

export interface Property {
  id: string;
  applicationId?: string;
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface PropertiesApiResponse {
  status?: string;
  message?: string;
  data?: Property[];
  error?: string;
}

export async function getAllProperties(
  signal?: AbortSignal
): Promise<Property[]> {
  const response = await fetch("/api/CasinoPlayerTracking/properties/get-all", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
    cache: "no-store",
    signal,
  });

  let payload: PropertiesApiResponse | Property[] | null = null;

  try {
    payload = (await response.json()) as PropertiesApiResponse | Property[];
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const apiPayload = payload as PropertiesApiResponse | null;

    throw new Error(
      apiPayload?.message ||
        apiPayload?.error ||
        `Failed to load properties (${response.status}).`
    );
  }

  const properties = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : [];

  return properties.map((property) => ({
    id: property.id,
    applicationId: property.applicationId,
    name: capitalizePropertyName(property.name) || "Unknown Property",
    primaryColor: property.primaryColor,
    secondaryColor: property.secondaryColor,
  }));
}

// ─── Players ───────────────────────────────────────────

export async function getAllRegisteredPlayers(): Promise<Player[]> {
  const res = await post<ApiPlayer[]>("/players/get-all-registered");
  if (res.status !== "200" || !res.data)
    throw new Error(res.message || "Failed to load records");

  return res.data.map((apiPlayer) => mapApiPlayer(apiPlayer));
}

export async function getAllPlayersApi(): Promise<ApiPlayer[]> {
  const res = await post<ApiPlayer[]>("/players/get-all");
  if (res.status !== "200" || !res.data)
    throw new Error(res.message || "Failed to load records");

  // Being used in Dashboard View and Daily Entry

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

  console.log("Fetched players by gamer number:", res.data);

  return res.data;
}

export async function createPlayerApi(data: CreatePlayer): Promise<ApiPlayer> {
  const res = await post<ApiPlayer>("/players/create", data);
  if (res.status !== "200" || !res.data)
    throw new Error(res.message || "Failed to create player");
  return res.data;
}

export async function updatePlayerApi(data: UpdatePlayerRequest): Promise<void> {
  const res = await post<unknown>("/players/update", data);
  if (res.status !== "200")
    throw new Error(res.message || "Failed to update player");
}

// ─── Transactions ──────────────────────────────────────

export async function createTransactionApi(data: CreateTransactionRequest): Promise<ApiTransaction> {
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

export async function updateTransactionApi(data: UpdateTransactionRequest): Promise<void> {
  // console.log("Updating transaction with data:", data);
  const res = await post<unknown>("/transactions/update", data);
  if (res.status !== "200")
    throw new Error(res.message || "Failed to update transaction");
}

export async function lockTransactionApi(data: LockTransactionRequest): Promise<void> {
  const res = await post<unknown>("/transactions/lock", data);
  if (res.status !== "200")
    throw new Error(res.message || "Failed to lock transaction");
}

// ─── Daily Report ──────────────────────────────────────

export async function getDailyReport(payload: DailyReportRequest): Promise<ApiDailyReport | null> {
  // console.log("Fetching daily report for business date:", payload);
  console.log("Daily report payload:", payload);

  const res = await post<ApiDailyReport>(
    "/GetDailyReportByBusinessDate",
    payload
  );

  if (res.status !== "200" || !res.data) return null;

  // console.log("Fetched daily report:", res.data);
  return res.data;
}

// ─── Transaction Logs ──────────────────────────────────────
export async function getTransactionLogs(
  transactionId: string
): Promise<Logs[]> {
  const res = await post<Logs[]>("/transactions/logs", { transactionId });
  if (res.status !== "200" || !res.data)
    throw new Error(res.message || "Failed to load records");
  return res.data;
}

// ─── Mappers ───────────────────────────────────────────

function mapCashier(api: ApiCashier): Cashier {
  const validRoles: Role[] = ["cashier", "supervisor", "manager"];
  const role: Role = validRoles.includes(api.role?.trim().toLowerCase() as Role)
    ? (api.role.trim().toLowerCase() as Role)
    : "cashier";
  return {
    id: api.id,
    firstName: api.firstName,
    lastName: api.lastName,
    name: [api.firstName, api.lastName].filter(Boolean).join(" ") || "Unknown",
    pin: "",
    propertyIds:
      api.propertyIds ?? api.properties?.map((property) => property.id),
    role,
    active: api.active,
    employeeCode: api.employeeCode || undefined,
    phone: api.phone || undefined,
  };
}

export function mapApiTransaction(api: ApiTransactionSummary): Transaction {
  // console.log("Mapping API transaction:", api);

  return {
    id: api.id,
    direction: (api.direction === "outgoing"
      ? "outgoing"
      : "incoming") as Direction,
    category: api.category || "Other",
    amount: api.amount,
    cashierId: api.createdByCashierId || "",
    playerId: api.playerId,
    playerName: api.playerName,
    cashierName: api.cashierName,
    status: api.status as AlertStatus,
    referenceNumber: api.referenceNumber,
    date: api.date,
    notes: api.notes,
  };
}

export function mapApiPlayer(
  api: ApiPlayer,
  transactions: Transaction[] = (api.transactions || []).map(mapApiTransaction)
): Player {
  return {
    id: api.id,
    firstName: api.firstName || undefined,
    lastName: api.lastName || undefined,
    active: api.active,
    race: api.race,
    gender: api.gender,
    age: api.age,
    build: api.build,
    description: api.description,
    refused: api.refused,
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

export async function searchPlayersByName(fullName: string): Promise<ApiPlayer[]> {
  const res = await post<ApiPlayer[]>("/SearchPlayersByName", { fullName });
  if (res.status === "404") return [];
  if (res.status !== "200")
    throw new Error(res.message || "Failed to search players");
  return res.data || [];
}

export async function getPlayerById(id: string): Promise<ApiPlayer> {
  const res = await post<ApiPlayer>("/players/get-by-id", { id });
  if (res.status !== "200" || !res.data)
    throw new Error(res.message || "Player not found");
  return res.data;
}

export async function getCashierById(id: string): Promise<Cashier> {
  const res = await post<ApiCashier>("/cashiers/get-by-id", { id });
  if (res.status !== "200" || !res.data)
    throw new Error(res.message || "Cashier not found");
  return mapCashier(res.data);
}

export async function deletePlayerApi(data: DeleteRecordRequest): Promise<void> {
  const res = await post<unknown>("/players/delete", data);
  if (res.status !== "200")
    throw new Error(res.message || "Failed to delete player");
}
