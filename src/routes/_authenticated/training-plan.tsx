import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Square, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { loadGrade, gradeLabel } from "@/lib/grade";

export const Route = createFileRoute("/_authenticated/training-plan")({
  head: () => ({
    meta: [
      { title: "AI Weekly Training Plan — RiseUp Hoops" },
      { name: "description", content: "Get a personalized weekly basketball training plan built from your goals and drill history." },
      { property: "og:title", content: "AI Weekly Training Plan — RiseUp Hoops" },
      { property: "og:description", content: "Personalized weekly basketball workouts based on your goals and shooting stats." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrainingPlanPage,
});

const PLAN_KEY = "hoops.trainingPlan";

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}

function PlanView({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-foreground">
      {text.split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return <div key={i} className="h-1" />;
        if (t.startsWith("#")) {
          return (
            <h3 key={i} className="pt-3 font-display text-2xl tracking-wide text-primary">
              {t.replace(/^#+\s*/, "")}
            </h3>
          );
        }
        if (/^[-*]\s/.test(t)) {
          return (
            <p key={i} className="flex gap-2 pl-2">
              <span className="text-primary">•</span>
              <span>{renderInline(t.slice(2))}</span>
            </p>
          );
        }
        return <p key={i}>{renderInline(t)}</p>;
      })}
    </div>
  );
}

function TrainingPlanPage() {
  const [goals, setGoals] = useState("");
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState(4);
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drillCount, setDrillCount] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(PLAN_KEY);
    if (saved) setPlan(saved);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    supabase
      .from("drill_sessions")
      .select("id", { count: "exact", head: true })
      .gte("performed_at", since)
      .then(({ count }) => setDrillCount(count ?? 0));
  }, []);

  async function generate() {
    setError(null);
    if (goals.trim().length < 3) {
      setError("Tell us at least one skill goal.");
      return;
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setError("Please sign in again.");
      return;
    }
    const grade = loadGrade();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setPlan("");
    let acc = "";
    try {
      const res = await fetch("/api/training-plan", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          goals,
          notes: notes || undefined,
          daysPerWeek: days,
          level: grade ? gradeLabel(grade) : undefined,
        }),
      });
      if (!res.ok || !res.body) {
        setError((await res.text()) || "Something went wrong.");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setPlan(acc);
      }
      if (!acc.trim()) setError("The coach AI returned an empty plan. Please try again later.");
      else localStorage.setItem(PLAN_KEY, acc);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("Connection lost. Please try again.");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
          <Link to="/scout-profile" className="text-sm text-muted-foreground hover:text-foreground">
            Log drills →
          </Link>
        </div>
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">AI Coach</p>
          <h1 className="font-display text-5xl tracking-wide text-foreground">Weekly Training Plan</h1>
          <p className="mt-2 text-muted-foreground">
            Share your goals — we'll combine them with your last 30 days of drills
            {drillCount !== null && ` (${drillCount} session${drillCount === 1 ? "" : "s"} logged)`} to build your week.
          </p>
        </header>

        <section className="card-elevated space-y-5 rounded-2xl border border-border bg-card p-6">
          <div className="space-y-2">
            <label htmlFor="goals" className="text-sm font-semibold text-foreground">Skill goals</label>
            <Textarea
              id="goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. Raise my free throw % to 80, get a quicker release on catch-and-shoot threes, tighten left-hand handle"
              rows={4}
              maxLength={1500}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-semibold text-foreground">Notes (optional)</label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Schedule, equipment, sore ankle, season games…"
              rows={2}
              maxLength={1000}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Training days per week</p>
            <div className="flex flex-wrap gap-2">
              {[2, 3, 4, 5, 6, 7].map((d) => (
                <Button key={d} type="button" size="sm" variant={d === days ? "default" : "outline"} onClick={() => setDays(d)}>
                  {d}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            {loading ? (
              <Button variant="outline" onClick={() => abortRef.current?.abort()}>
                <Square className="mr-2 h-4 w-4" /> Stop
              </Button>
            ) : (
              <Button variant="hero" onClick={generate}>
                <Sparkles className="mr-2 h-4 w-4" /> {plan ? "Build a new plan" : "Build my plan"}
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </section>

        {(plan || loading) && (
          <section className="card-elevated rounded-2xl border border-border bg-card p-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-3xl tracking-wide text-foreground">Your Week</h2>
              {plan && !loading && (
                <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(plan)}>
                  <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>
              )}
            </div>
            {plan ? <PlanView text={plan} /> : <p className="animate-pulse text-muted-foreground">Coach is drawing up your week…</p>}
          </section>
        )}
      </div>
    </main>
  );
}
