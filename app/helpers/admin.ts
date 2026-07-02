// helpers/adminCashierHelpers.ts
import type { Cashier, Role } from "../lib/types";
import { createCashierApi, updateCashierApi } from "../lib/api";

export interface AddCashierDraft {
  firstName: string;
  lastName: string;
  pin: string;
  role: Role;
  employeeCode: string;
  phone: string;
}

export interface EditCashierDraft {
  id: string;
  firstName: string;
  lastName: string;
  pin: string;
  role: Role;
  employeeCode: string;
  phone: string;
  active: boolean;
}

export const EMPTY_CASHIER_DRAFT: AddCashierDraft = {
  firstName: "",
  lastName: "",
  pin: "",
  role: "cashier",
  employeeCode: "",
  phone: "",
};

export function getCashierNameParts(name: string) {
  const [firstName, ...rest] = name.split(" ");

  return {
    firstName,
    lastName: rest.join(" "),
  };
}

export function buildEditDraft(cashier: Cashier): EditCashierDraft {
  const { firstName, lastName } = getCashierNameParts(cashier.name);

  return {
    id: cashier.id,
    firstName,
    lastName,
    pin: "",
    role: cashier.role,
    employeeCode: cashier.employeeCode || "",
    phone: cashier.phone || "",
    active: cashier.active,
  };
}

export function validateCreateCashierDraft(draft: AddCashierDraft) {
  if (!draft.firstName.trim()) return "First name is required.";
  if (!draft.lastName.trim()) return "Last name is required.";
  if (!/^\d{4}$/.test(draft.pin)) return "PIN must be exactly 4 digits.";

  return "";
}

export function validateEditCashierDraft(draft: EditCashierDraft) {
  if (draft.pin && !/^\d{4}$/.test(draft.pin)) {
    return "PIN must be exactly 4 digits.";
  }

  return "";
}

export async function createCashierFromDraft(draft: AddCashierDraft) {
  return createCashierApi({
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    pin: draft.pin,
    role: draft.role,
    employeeCode: draft.employeeCode.trim() || undefined,
    phone: draft.phone.trim() || undefined,
  });
}

export async function updateCashierFromDraft(
  draft: EditCashierDraft,
  updatedBy: string
) {
  const payload: Parameters<typeof updateCashierApi>[0] = {
    id: draft.id,
    firstName: draft.firstName,
    lastName: draft.lastName,
    role: draft.role,
    employeeCode: draft.employeeCode || undefined,
    phone: draft.phone || undefined,
    active: draft.active,
    updatedBy,
  };

  if (draft.pin) {
    payload.pin = draft.pin;
  }

  await updateCashierApi(payload);
}

export async function toggleCashierActiveApi(cashier: Cashier, updatedBy: string) {
  const { firstName, lastName } = getCashierNameParts(cashier.name);

  await updateCashierApi({
    id: cashier.id,
    firstName,
    lastName,
    active: !cashier.active,
    employeeCode: cashier.employeeCode,
    phone: cashier.phone,
    role: cashier.role,
    updatedBy,
  });
}