export function canAccessPath(role: string, path: string) {
  const normalized = role.trim().toLowerCase();
  if (path === "/login") return true;
  if (normalized === "manager") return true;
  if (normalized === "supervisor")
    return ["/", "/daily-entry", "/reports", "/registered-players"].includes(
      path
    );
  return normalized === "cashier" && path === "/daily-entry";
}
export function canAccessView(role: string, view: string) {
  const paths: Record<string, string> = {
    dashboard: "/",
    entry: "/daily-entry",
    players: "/registered-players",
    "registered-players": "/registered-players",
    reports: "/reports",
    admin: "/administration",
    properties: "/property-management",
  };
  return (
    view !== "properties" && canAccessPath(role, paths[view] || "/restricted")
  );
}
