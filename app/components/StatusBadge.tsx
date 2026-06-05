"use client";

import { AlertTriangle, CheckCircle } from "lucide-react";
import type { AlertStatus } from "../lib/types";

export function StatusBadge({ status }: { status: AlertStatus }) {
  if (status === "compliance")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <CheckCircle size={9} />
        COMPLIANCE REQ.
      </span>
    );
  if (status === "warning")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <AlertTriangle size={9} />
        APPROACHING
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-mono text-muted-foreground border border-border">
      NORMAL
    </span>
  );
}
