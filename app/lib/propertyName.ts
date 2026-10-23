const ACRONYMS = new Set([
  "PR",
  "USA",
  "LLC",
  "COC",
  "CVH",
  "LCR",
  "CRH",
  "VIP",
]);
export function capitalizePropertyName(name?: string | null): string {
  return (name || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\p{L}[\p{L}\p{M}]*/gu, (word) =>
      ACRONYMS.has(word.toUpperCase())
        ? word.toUpperCase()
        : word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase()
    );
}
