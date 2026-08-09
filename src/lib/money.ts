/**
 * Money helpers.
 * All arithmetic happens in integer minor units (paise) so that repeated
 * additions never accumulate binary floating point error.
 */

export type Minor = number;

export const toMinor = (value: number | string | null | undefined): Minor => {
  const n = typeof value === "string" ? Number.parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
};

export const toMajor = (minor: Minor): number => minor / 100;

export const sumMinor = (values: ReadonlyArray<number | string | null>): Minor =>
  values.reduce<Minor>((acc, v) => acc + toMinor(v), 0);

const formatter = (currency: string, compact: boolean) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: compact ? 1 : 2,
    minimumFractionDigits: compact ? 0 : 2,
    notation: compact ? "compact" : "standard",
  });

export const formatMoney = (
  minor: Minor,
  options: { currency?: string; compact?: boolean; signed?: boolean } = {},
): string => {
  const { currency = "INR", compact = false, signed = false } = options;
  const text = formatter(currency, compact).format(toMajor(Math.abs(minor)));
  if (signed && minor !== 0) return `${minor > 0 ? "+" : "−"}${text}`;
  return minor < 0 ? `−${text}` : text;
};

export const formatAmount = (
  value: number | string | null | undefined,
  options?: { currency?: string; compact?: boolean; signed?: boolean },
): string => formatMoney(toMinor(value), options);

export const percentOf = (part: Minor, whole: Minor): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 100);
