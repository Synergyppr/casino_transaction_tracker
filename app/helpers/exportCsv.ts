// lib/exportReportsCsv.ts
import type { TransactionRow } from "../components/ReportsView";

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportTransactionsToCsv(
  rows: TransactionRow[],
  selectedDate: string
) {
  const headers = [
    "Date",
    "Time",
    "Player",
    // "Gamer Number",
    "Direction",
    "Category",
    "Amount",
    "Transaction ID",
  ];

  const csvRows = rows.map((row) => [
    row.date,
    row.time,
    row.playerName,
    // row.gamerNumber || "",
    row.direction,
    row.category || "Other",
    row.amount,
    row.id,
  ]);

  const csv = [headers, ...csvRows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `transaction-report-${selectedDate}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}