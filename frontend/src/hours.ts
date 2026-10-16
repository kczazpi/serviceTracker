/** The quick choices in the hours menu; anything else goes through "Custom". */
export const HOUR_PRESETS = [1, 2, 4, 8, 12] as const;

// Same limits the API enforces on WorkedHours.
export const MIN_HOURS = 0.01;
export const MAX_HOURS = 24;

/** Parses what was typed into the custom field; null when it isn't a number between 0.01 and 24. */
export function parseCustomHours(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= MIN_HOURS && value <= MAX_HOURS ? value : null;
}
