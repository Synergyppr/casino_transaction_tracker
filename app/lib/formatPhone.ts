export function formatPhoneNumber(value?: string | null): string {
  const phone = value?.trim();
  if (!phone) return "—";
  const match = phone.match(/^(.*?)(?:\s*(?:ext\.?|x|#)\s*(\d+))?$/i);
  const base = match?.[1] || phone;
  const digits = base.replace(/\D/g, "");
  const extension = match?.[2] ? ` ext. ${match[2]}` : "";
  if (digits.length === 10)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(
      6
    )}${extension}`;
  if (digits.length === 11 && digits.startsWith("1"))
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(
      7
    )}${extension}`;
  return phone;
}
