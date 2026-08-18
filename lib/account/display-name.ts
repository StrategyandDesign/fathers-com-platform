export const DISPLAY_NAME_MAX = 80;

export type DisplayNameError = "required" | "tooLong";

export function normalizeDisplayName(value: unknown) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDisplayName(
  value: unknown
): { name: string } | { error: DisplayNameError } {
  const name = normalizeDisplayName(value);
  if (!name) return { error: "required" };
  if (name.length > DISPLAY_NAME_MAX) return { error: "tooLong" };
  return { name };
}
