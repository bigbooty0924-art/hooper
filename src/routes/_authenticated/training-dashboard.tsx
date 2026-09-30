import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Circle, Sparkles, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { pct } from "@/lib/scout";

export const Route = createFileRoute("/_authenticated/training-dashboard")({
  head: () => ({
    meta: [
      { title: "Training Plan Dashboard — RiseUp Hoops" },
      { name: "description", content: "Your weekly training plan, upcoming drills, and progress toward your skill goals." },
      { property: "og:title", content: "Training Plan Dashboard — RiseUp Hoops" },
      { property: "og:description", content: "Track your weekly basketball plan and skill-goal progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrainingDashboardPage,
});

const PLAN_KEY = "hoops.trainingPlan";
const GOALS_KEY = "hoops.trainingGoals";
const CHECKS_KEY = "hoops.trainingChecks";

type DayPlan = { day: string; lines: string[] };

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function parsePlan(text: string): DayPlan[] {
  const days: DayPlan[] = [];
  let current: DayPlan | null = null;
  for (const raw of text.split("\n")) {
    const t = raw.trim();
    const m = t.match(/^#+\s*(.+)/) || t.match(/^\*\*(.+)\*\*\s*:?\s*$/);
    const heading = m?.[1] ?? "";
    const dayName = DAY_NAMES.find((d) => new RegExp(`\\b${d}\\b`, "i").test(heading));
    if (dayName) {
      current = { day: dayName, lines: [] };
      days.push(current);
      continue;
    }
    if (current && t) current.lines.push(t.replace(/^[-*]\s+/, "").replace(/\*\*/g, ""));
  }
  return days;
}

function loadChecks(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(CHECKS_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

function TrainingDashboardPage() {
  const [plan, setPlan] = useState("");
  const [goals, setGoals] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<{ ftPct: number | null; threePct: number | null; sessions: number; weekSessions: number } | null>(null);

  useEffect(() => {
    setPlan(localStorage.getItem(PLAN_KEY) ?? "");
    setGoals(localStorage.getItem(GOALS_KEY) ?? "");
    setChecks(loadChecks());

    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    supabase
      .from("drill_sessions")
      .select("drill_type, attempts, makes, performed_at")
      .gte("performed_at", since30)
      .then(({ data }) => {
        const rows = data ?? [];
        const sum = (type: string, key: "attempts" | "makes") =>
          rows.filter((r) => r.drill_type === type).reduce((a, r) => a + r[key], 0);
        const ftA = sum("free_throw", "attempts");
        const ftM = sum("free_throw", "makes");
        const thA = sum("three_point", "attempts");
        const thM = sum("three_point", "makes");
        setStats({
          ftPct: ftA > 0 ? (ftM / ftA) * 100 : null,
          threePct: thA > 0 ? (thM / thA) * 100 : null,
          sessions: rows.length,
          weekSessions: rows.filter((r) => r.performed_at >= weekStart.toISOString()).length,
        });
      });
  }, []);

  const days = useMemo(() => parsePlan(plan), [plan]);
  const todayName = DAY_NAMES[(new Date().getDay() + 6) % 7];
  const todayPlan = days.find((d) => d.day === todayName) ?? days[0] ?? null;
  const upcoming = todayPlan ? days.slice(days.indexOf(todayPlan) + 1) : days;

  const allItems = days.flatMap((d) => d.lines.map((l, i) => ({ key: `${d.day}:${i}`, label: l, day: d.day })));
  const doneCount = allItems.filter((it) => checks[it.key]).length;
  const completion = allItems.length > 0 ? Math.round((doneCount / allItems.length) * 100) : 0;

  const goalTargets = useMemo(() => {
    const out: { label: string; current: number | null; target: number }[] = [];
    const ft = goals.match(/free throw[^\d]*(\d{2,3})/i) || goals.match(/ft%?[^\d]*(\d{2,3})/i);
    const th = goals.match(/(three|3-?point|3pt)[^\d]*(\d{2,3})/i);
    if (ft?.[1] && stats) out.push({ label: "Free Throw %", current: stats.ftPct, target: Math.min(100, parseInt(ft[1], 10)) });
    if (th?.[2] && stats) out.push({ label: "3-Point %", current: stats.threePct, target: Math.min(100, parseInt(th[2], 10)) });
    return out;
  }, [goals, stats]);

  function toggle(key: string) {
    setChecks((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(CHECKS_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
          <Link to="/training-plan" className="text-sm text-muted-foreground hover:text-foreground">
            AI Coach →
          </Link>
        </div>

        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Training</p>
          <h1 className="font-display text-5xl tracking-wide text-foreground">Plan Dashboard</h1>
        </header>

        {!plan ? (
          <section className="card-elevated rounded-2xl border border-border bg-card p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-3 font-display text-3xl tracking-wide text-foreground">No plan yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Build a personalized weekly plan with the AI coach, then come back here to track it.
            </p>
            <Button asChild variant="hero" className="mt-5">
              <Link to="/training-plan">Build my plan</Link>
            </Button>
          </section>
        ) : (
          <>
            {/* Week at a glance */}
            <section className="card-elevated rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-3xl tracking-wide text-foreground">This Week</h2>
                <span className="text-sm text-muted-foreground">
                  {doneCount}/{allItems.length} drills done
                </span>
              </div>
              <Progress value={completion} className="h-2" />
              <p className="mt-2 text-sm text-muted-foreground">{completion}% of this week's plan complete</p>
            </section>

            {/* Today's drills */}
            {todayPlan && (
              <section className="card-elevated rounded-2xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-3xl tracking-wide text-foreground">
                    {todayPlan.day === todayName ? "Today's Drills" : `Next Up: ${todayPlan.day}`}
                  </h2>
                </div>
                <ul className="space-y-2">
                  {todayPlan.lines.map((line, i) => {
                    const key = `${todayPlan.day}:${i}`;
                    const done = !!checks[key];
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => toggle(key)}
                          className="flex w-full items-start gap-3 rounded-lg border border-border bg-background/40 p-3 text-left text-sm transition-colors hover:border-primary/50"
                        >
                          {done ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className={done ? "text-muted-foreground line-through" : "text-foreground"}>{line}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Upcoming days */}
            {upcoming.length > 0 && (
              <section className="card-elevated rounded-2xl border border-border bg-card p-6">
                <h2 className="mb-4 font-display text-3xl tracking-wide text-foreground">Upcoming</h2>
                <div className="space-y-4">
                  {upcoming.map((d) => (
                    <div key={d.day}>
                      <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-primary">{d.day}</p>
                      <ul className="space-y-1">
                        {d.lines.map((l, i) => (
                          <li key={i} className="pl-3 text-sm text-muted-foreground">
                            • {l}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Goal progress */}
        <section className="card-elevated rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="font-display text-3xl tracking-wide text-foreground">Skill Goal Progress</h2>
          </div>
          {goals ? (
            <p className="mb-4 rounded-lg border border-border bg-background/40 p-3 text-sm italic text-muted-foreground">
              “{goals}”
            </p>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">
              No goals saved yet — set them when you build a plan with the AI coach.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Free Throw % (30 days)</p>
              <p className="mt-1 font-display text-4xl text-foreground">{stats?.ftPct != null ? pct(stats.ftPct) : "—"}</p>
              {goalTargets.find((g) => g.label === "Free Throw %") && stats?.ftPct != null && (
                <Progress value={Math.min(100, (stats.ftPct / goalTargets.find((g) => g.label === "Free Throw %")!.target) * 100)} className="mt-2 h-2" />
              )}
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">3-Point % (30 days)</p>
              <p className="mt-1 font-display text-4xl text-foreground">{stats?.threePct != null ? pct(stats.threePct) : "—"}</p>
              {goalTargets.find((g) => g.label === "3-Point %") && stats?.threePct != null && (
                <Progress value={Math.min(100, (stats.threePct / goalTargets.find((g) => g.label === "3-Point %")!.target) * 100)} className="mt-2 h-2" />
              )}
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Sessions this week</p>
              <p className="mt-1 font-display text-4xl text-foreground">{stats?.weekSessions ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Sessions (30 days)</p>
              <p className="mt-1 font-display text-4xl text-foreground">{stats?.sessions ?? "—"}</p>
            </div>
          </div>
          {goalTargets.length > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                {goalTargets
                  .map((g) =>
                    g.current != null
                      ? `${g.label}: ${pct(g.current)} of ${g.target}% goal`
                      : `${g.label}: log drills to start tracking toward ${g.target}%`,
                  )
                  .join(" · ")}
              </span>
            </div>
          )}
          <Button asChild variant="outline" className="mt-4">
            <Link to="/scout-profile">Log a drill session</Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
