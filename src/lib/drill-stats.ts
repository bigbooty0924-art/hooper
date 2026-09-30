import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const WEEKLY_TARGET_DAYS = 6;

type SessionRow = { drill_type: string; performed_at: string };

export type DrillStats = {
  signedIn: boolean;
  currentStreak: number;
  longestStreak: number;
  daysThisWeek: number;
  weeklyConsistency: number;
  sessionsThisMonth: number;
  sessionsLastMonth: number;
  daysThisWeekByType: Record<string, number>;
};

const EMPTY: Omit<DrillStats, "signedIn"> = {
  currentStreak: 0,
  longestStreak: 0,
  daysThisWeek: 0,
  weeklyConsistency: 0,
  sessionsThisMonth: 0,
  sessionsLastMonth: 0,
  daysThisWeekByType: {},
};

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function computeDrillStats(rows: SessionRow[], now = new Date()): Omit<DrillStats, "signedIn"> {
  if (rows.length === 0) return EMPTY;

  const dates = rows.map((r) => new Date(r.performed_at));
  const trainedDays = new Set(dates.map(dayKey));

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let cursor = trainedDays.has(dayKey(today)) ? today : addDays(today, -1);
  let currentStreak = 0;
  while (trainedDays.has(dayKey(cursor))) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  const sortedDays = [...new Set(dates.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()))].sort(
    (a, b) => a - b,
  );
  let longestStreak = 0;
  let run = 0;
  let prev: number | null = null;
  for (const time of sortedDays) {
    run = prev !== null && dayKey(addDays(new Date(prev), 1)) === dayKey(new Date(time)) ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = time;
  }

  const weekStart = addDays(today, -((today.getDay() + 6) % 7));
  const thisWeek = rows.filter((r) => new Date(r.performed_at) >= weekStart);
  const daysThisWeek = new Set(thisWeek.map((r) => dayKey(new Date(r.performed_at)))).size;

  const byType: Record<string, Set<string>> = {};
  for (const r of thisWeek) {
    (byType[r.drill_type] ??= new Set()).add(dayKey(new Date(r.performed_at)));
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return {
    currentStreak,
    longestStreak,
    daysThisWeek,
    weeklyConsistency: Math.min(100, Math.round((daysThisWeek / WEEKLY_TARGET_DAYS) * 100)),
    sessionsThisMonth: dates.filter((d) => d >= monthStart).length,
    sessionsLastMonth: dates.filter((d) => d >= lastMonthStart && d < monthStart).length,
    daysThisWeekByType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.size])),
  };
}

export function useDrillStats() {
  return useQuery({
    queryKey: ["drill-stats"],
    queryFn: async (): Promise<DrillStats> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return { signedIn: false, ...EMPTY };

      const { data, error } = await supabase
        .from("drill_sessions")
        .select("drill_type, performed_at")
        .eq("user_id", uid)
        .order("performed_at", { ascending: false })
        .limit(2000);
      if (error) throw error;

      return { signedIn: true, ...computeDrillStats(data ?? []) };
    },
  });
}
