export const GRADES = [6, 7, 8, 9, 10, 11, 12] as const;
export type Grade = (typeof GRADES)[number];

export const STORAGE_KEY = "hoops.gradeLevel";

export type Tier = "foundation" | "recruitment";

export function tierForGrade(grade: Grade): Tier {
  return grade <= 8 ? "foundation" : "recruitment";
}

export function isRecruitmentUnlocked(grade: Grade | null): boolean {
  return grade !== null && tierForGrade(grade) === "recruitment";
}

export function gradeLabel(grade: Grade): string {
  const suffix = grade === 11 || grade === 12 ? "th" : grade === 6 ? "th" : "th";
  return `${grade}${suffix} Grade`;
}

export function loadGrade(): Grade | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return (GRADES as readonly number[]).includes(parsed) ? (parsed as Grade) : null;
}

export function saveGrade(grade: Grade): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, String(grade));
}

export function clearGrade(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
