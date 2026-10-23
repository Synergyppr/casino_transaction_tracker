"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessPath } from "../lib/permissions";

export function RoutePermissions({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [allowedPath, setAllowedPath] = useState<string | null>(null);

  useEffect(() => {
    if (path === "/login") return;
    let role = "";
    try {
      role = JSON.parse(sessionStorage.getItem("casino_session") || "null")?.cashier?.role || "";
    } catch { }
    if (!role) { router.replace("/login"); return; }
    if (!canAccessPath(role, path)) { router.replace("/daily-entry"); return; }
    queueMicrotask(() => setAllowedPath(path));
  }, [path, router]);
  if (path === "/login" || allowedPath === path) return children;
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      Checking access...
    </div>
  );
}
