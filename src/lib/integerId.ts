/** Whole-number id from JSON/pg values that sometimes arrive as strings. */
export function toIntegerId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return undefined;
}

export function isIntegerId(value: unknown): boolean {
  return toIntegerId(value) !== undefined;
}
