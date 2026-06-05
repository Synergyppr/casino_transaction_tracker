"use client";

import { WARNING_THRESHOLD, COMPLIANCE_THRESHOLD } from "../lib/constants";
import { fmt } from "../lib/utils";

export function AmtCell({ amount }: { amount: number }) {
  const isCompliance = amount >= COMPLIANCE_THRESHOLD;
  const isWarning = amount >= WARNING_THRESHOLD;
  return (
    <span
      className={`font-mono text-xs ${
        isCompliance ? "text-emerald-400 font-semibold" : isWarning ? "text-amber-400 font-semibold" : "text-foreground"
      }`}
    >
      {fmt(amount)}
    </span>
  );
}
