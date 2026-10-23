import { loginCashier } from "./api";
import {
  applyPropertyTheme,
  saveSelectedProperty,
  type SelectedProperty,
} from "./propertyTheme";
export async function switchManagerProperty(
  user: { id: string; role: string },
  pin: string,
  property: SelectedProperty
) {
  if (user.role.trim().toLowerCase() !== "manager")
    throw new Error("Only managers can switch properties.");
  if (!/^\d{4}$/.test(pin)) throw new Error("Enter your 4-digit PIN.");
  const verified = await loginCashier(pin, property.id);
  if (
    verified.id !== user.id ||
    verified.role !== "manager" ||
    !verified.active
  )
    throw new Error(
      "Use the PIN for your current manager account with access to this property."
    );
  saveSelectedProperty(property);
  sessionStorage.setItem(
    "casino_session",
    JSON.stringify({ cashier: verified, lastActivity: Date.now() })
  );
  applyPropertyTheme(property);
  return verified;
}
