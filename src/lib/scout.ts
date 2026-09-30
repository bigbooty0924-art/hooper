export function formatHeight(inches: number | null | undefined): string {
  if (!inches) return "—";
  const feet = Math.floor(inches / 12);
  const rest = inches % 12;
  return `${feet}'${rest}"`;
}

export function formatWeight(lbs: number | null | undefined): string {
  return lbs ? `${lbs} lbs` : "—";
}

export function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value}%`;
}

export const POSITIONS = [
  "Point Guard",
  "Shooting Guard",
  "Small Forward",
  "Power Forward",
  "Center",
  "Combo Guard",
  "Wing",
] as const;
