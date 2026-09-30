import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CORE_CATEGORIES, TOTAL_CORE_COURSES } from "@/lib/core-courses";

export const Route = createFileRoute("/_authenticated/parent-view")({
  head: () => ({
    meta: [
      { title: "Parent View — RiseUp Hoops" },
      {
        name: "description",
        content:
          "Link a parent account with a 6-digit code to follow workouts, shooting progress and NCAA core-course status.",
      },
      { property: "og:title", content: "Parent View — RiseUp Hoops" },
      {
        property: "og:description",
        content: "Follow your player's workouts, progress and academic eligibility in one place.",
      },
    ],
  }),
  component: ParentView,
});

type Session = {
  id: string;
  drill_type: string;
  attempts: number;
  makes: number;
  performed_at: string;
};

type LinkedPlayer = {
  userId: string;
  name: string;
  sessions: Session[];
  coursesCompleted: number;
  categoryCounts: Record<string, number>;
};

function ParentView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [codeExpires, setCodeExpires] = useState<string | null>(null);
  const [parentCount, setParentCount] = useState(0);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<LinkedPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLinkedPlayers = useCallback(async () => {
    const { data: links } = await supabase
      .from("parent_links")
      .select("player_user_id")
      .eq("status", "linked");
    const ids = [...new Set((links ?? []).map((l) => l.player_user_id))];
    if (ids.length === 0) {
      setPlayers([]);
      return;
    }

    const [{ data: profiles }, { data: sessions }, { data: courses }] = await Promise.all([
      supabase.from("scout_profiles").select("user_id, full_name").in("user_id", ids),
      supabase
        .from("drill_sessions")
        .select("id, user_id, drill_type, attempts, makes, performed_at")
        .in("user_id", ids)
        .order("performed_at", { ascending: false })
        .limit(200),
      supabase.from("core_courses").select("user_id, category, completed").in("user_id", ids),
    ]);

    setPlayers(
      ids.map((id) => {
        const courseRows = (courses ?? []).filter((c) => c.user_id === id && c.completed);
        const categoryCounts: Record<string, number> = {};
        for (const row of courseRows) {
          categoryCounts[row.category] = (categoryCounts[row.category] ?? 0) + 1;
        }
        return {
          userId: id,
          name: profiles?.find((p) => p.user_id === id)?.full_name ?? "Your player",
          sessions: ((sessions ?? []) as (Session & { user_id: string })[]).filter(
            (s) => s.user_id === id,
          ),
          coursesCompleted: courseRows.length,
          categoryCounts,
        };
      }),
    );
  }, []);

  const loadMyCode = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("parent_links")
      .select("code, expires_at, status")
      .eq("player_user_id", uid)
      .order("created_at", { ascending: false });
    const pending = (data ?? []).find((row) => row.status === "pending");
    setCode(pending?.code ?? null);
    setCodeExpires(pending?.expires_at ?? null);
    setParentCount((data ?? []).filter((row) => row.status === "linked").length);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        await Promise.all([loadMyCode(uid), loadLinkedPlayers()]);
      }
      setLoading(false);
    })();
  }, [loadMyCode, loadLinkedPlayers]);

  const generate = async () => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("create_parent_link_code");
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setCode(data as string);
    if (userId) await loadMyCode(userId);
  };

  const redeem = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const clean = entry.replace(/\D/g, "");
    if (clean.length !== 6) {
      setError("Enter the 6-digit code from your player's app.");
      return;
    }
    const { error: rpcError } = await supabase.rpc("redeem_parent_link_code", { p_code: clean });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setEntry("");
    await loadLinkedPlayers();
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Family</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">Parent View</h1>
        </div>
        <Button variant="court" size="sm" asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <section className="card-elevated mt-6 p-6">
        <h2 className="text-2xl">Invite a parent</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Players: generate a code and read it to your parent. It works once and expires in 30
          minutes.
        </p>
        {code ? (
          <p className="mt-4 font-display text-6xl tracking-[0.2em] text-primary">{code}</p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No active code.</p>
        )}
        {codeExpires && code && (
          <p className="mt-1 text-xs text-muted-foreground">
            Expires {new Date(codeExpires).toLocaleTimeString()}
          </p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <Button variant="hero" onClick={generate}>
            {code ? "Generate new code" : "Generate code"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {parentCount} parent account{parentCount === 1 ? "" : "s"} linked
          </span>
        </div>
      </section>

      <section className="card-elevated mt-6 p-6">
        <h2 className="text-2xl">Link to your player</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Parents: enter the 6-digit code shown in your player's app.
        </p>
        <form onSubmit={redeem} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="code">6-digit code</Label>
            <Input
              id="code"
              inputMode="numeric"
              maxLength={6}
              className="w-40 text-center font-display text-2xl tracking-[0.3em]"
              value={entry}
              onChange={(e) => setEntry(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          <Button type="submit" variant="hero">
            Link account
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </section>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        players.map((player) => <PlayerPanel key={player.userId} player={player} />)
      )}
    </main>
  );
}

function PlayerPanel({ player }: { player: LinkedPlayer }) {
  const weekly = buildWeeklySeries(player.sessions);

  return (
    <section className="mt-8 space-y-6">
      <h2 className="font-display text-3xl">{player.name}</h2>

      <div className="card-elevated p-6">
        <h3 className="text-2xl">Shooting progress</h3>
        {weekly.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No drills logged yet.</p>
        ) : (
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    color: "var(--color-foreground)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Free throw %"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="3-point %"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card-elevated p-6">
        <h3 className="text-2xl">Recent workouts</h3>
        {player.sessions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {player.sessions.slice(0, 12).map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2 text-sm"
              >
                <span className="font-medium">
                  {session.drill_type === "free_throw" ? "Free throws" : "3-pointers"}
                </span>
                <span className="text-muted-foreground">
                  {session.makes}/{session.attempts} (
                  {Math.round((session.makes / session.attempts) * 100)}%)
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(session.performed_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-elevated p-6">
        <h3 className="text-2xl">NCAA Eligibility Center courses</h3>
        <Progress
          className="mt-4"
          value={(player.coursesCompleted / TOTAL_CORE_COURSES) * 100}
        />
        <p className="mt-2 text-sm text-muted-foreground">
          {player.coursesCompleted} of {TOTAL_CORE_COURSES} core courses marked complete.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {CORE_CATEGORIES.map((category) => (
            <li
              key={category.key}
              className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm"
            >
              <span>{category.label}</span>
              <span className="text-muted-foreground">
                {player.categoryCounts[category.key] ?? 0}/{category.years}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function buildWeeklySeries(sessions: Session[]) {
  const buckets = new Map<string, { ft: [number, number]; three: [number, number] }>();
  for (const session of sessions) {
    const date = new Date(session.performed_at);
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const label = `${monday.getMonth() + 1}/${monday.getDate()}`;
    const bucket = buckets.get(label) ?? { ft: [0, 0], three: [0, 0] };
    const target = session.drill_type === "free_throw" ? bucket.ft : bucket.three;
    target[0] += session.makes;
    target[1] += session.attempts;
    buckets.set(label, bucket);
  }
  return [...buckets.entries()]
    .reverse()
    .map(([week, value]) => ({
      week,
      "Free throw %": value.ft[1] ? Math.round((value.ft[0] / value.ft[1]) * 100) : null,
      "3-point %": value.three[1] ? Math.round((value.three[0] / value.three[1]) * 100) : null,
    }));
}
