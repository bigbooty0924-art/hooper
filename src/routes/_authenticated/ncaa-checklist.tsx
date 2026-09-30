import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CORE_CATEGORIES, TOTAL_CORE_COURSES, type CoreCourseRow } from "@/lib/core-courses";

export const Route = createFileRoute("/_authenticated/ncaa-checklist")({
  head: () => ({
    meta: [
      { title: "NCAA Compliance Checklist — RiseUp Hoops" },
      {
        name: "description",
        content:
          "Track all 16 NCAA Division I core courses and learn when college coaches are allowed to contact you.",
      },
      { property: "og:title", content: "NCAA Compliance Checklist — RiseUp Hoops" },
      {
        property: "og:description",
        content: "Check off your 16 core courses and understand the June 15 contact rule.",
      },
    ],
  }),
  component: ChecklistPage,
});

function key(category: string, slot: number) {
  return `${category}:${slot}`;
}

function ChecklistPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, CoreCourseRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data } = await supabase
        .from("core_courses")
        .select("id, category, slot, course_name, completed, grade")
        .eq("user_id", uid);
      const map: Record<string, CoreCourseRow> = {};
      for (const row of (data as CoreCourseRow[]) ?? []) {
        map[key(row.category, row.slot)] = row;
      }
      setRows(map);
      setLoading(false);
    })();
  }, []);

  const upsert = async (
    category: string,
    slot: number,
    patch: Partial<Pick<CoreCourseRow, "completed" | "course_name" | "grade">>,
  ) => {
    if (!userId) return;
    const existing = rows[key(category, slot)];
    const next = {
      user_id: userId,
      category,
      slot,
      completed: patch.completed ?? existing?.completed ?? false,
      course_name:
        patch.course_name !== undefined ? patch.course_name : (existing?.course_name ?? null),
      grade: patch.grade !== undefined ? patch.grade : (existing?.grade ?? null),
    };
    setRows((prev) => ({
      ...prev,
      [key(category, slot)]: { id: existing?.id ?? "temp", ...next } as CoreCourseRow,
    }));
    const { data } = await supabase
      .from("core_courses")
      .upsert(next, { onConflict: "user_id,category,slot" })
      .select("id, category, slot, course_name, completed, grade")
      .single();
    if (data) {
      setRows((prev) => ({ ...prev, [key(category, slot)]: data as CoreCourseRow }));
    }
  };

  const completed = Object.values(rows).filter((row) => row.completed).length;

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Division I eligibility
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl">NCAA Compliance Checklist</h1>
        </div>
        <Button variant="court" size="sm" asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <section className="card-elevated mt-6 p-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl">Core courses complete</h2>
          <p className="font-display text-4xl leading-none text-primary">
            {completed}/{TOTAL_CORE_COURSES}
          </p>
        </div>
        <Progress className="mt-4" value={(completed / TOTAL_CORE_COURSES) * 100} />
        <p className="mt-2 text-sm text-muted-foreground">
          Division I requires 16 NCAA-approved core courses, with 10 finished before the start of
          your senior year — seven of those in English, math or science.
        </p>
      </section>

      <section className="card-elevated mt-6 border-l-4 border-l-primary p-6">
        <div className="flex items-center gap-2 text-primary">
          <CalendarClock className="size-5" />
          <h2 className="text-2xl">When coaches can contact you</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Under NCAA rules, Division I coaches cannot initiate direct communication with you — no
          calls, texts, direct messages, or off-campus in-person conversations — and cannot extend
          a scholarship offer until <strong className="text-foreground">June 15 following your
          sophomore year</strong> of high school. Before that date, a coach may only send general
          camp or questionnaire material, and any conversation has to go through your high school
          or club coach.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          That rule limits the coach, not you. You can email coaches, send film, fill out
          questionnaires, and attend camps at any age — you just may not get a personal reply until
          that June 15 window opens. Keep your film and core-course record current so the
          conversation can start the day it's allowed.
        </p>
      </section>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading your checklist…</p>
      ) : (
        <div className="mt-8 space-y-6">
          {CORE_CATEGORIES.map((category) => (
            <section key={category.key} className="card-elevated p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl">{category.label}</h2>
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {
                    Array.from({ length: category.years }).filter(
                      (_, index) => rows[key(category.key, index)]?.completed,
                    ).length
                  }{" "}
                  / {category.years} years
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{category.detail}</p>

              <ul className="mt-4 space-y-3">
                {Array.from({ length: category.years }).map((_, index) => {
                  const row = rows[key(category.key, index)];
                  const done = row?.completed ?? false;
                  return (
                    <li
                      key={index}
                      className="flex flex-wrap items-center gap-3 rounded-lg bg-secondary px-3 py-2"
                    >
                      <button
                        type="button"
                        aria-pressed={done}
                        aria-label={`Mark ${category.label} year ${index + 1} complete`}
                        onClick={() => upsert(category.key, index, { completed: !done })}
                        className={`flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-[var(--transition-smooth)] ${
                          done
                            ? "border-success bg-success text-success-foreground"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        {done && <Check className="size-4" />}
                      </button>
                      <span className="w-14 text-xs uppercase tracking-widest text-muted-foreground">
                        Year {index + 1}
                      </span>
                      <Input
                        className="min-w-40 flex-1"
                        placeholder="Course name (e.g. Algebra II)"
                        maxLength={100}
                        defaultValue={row?.course_name ?? ""}
                        onBlur={(e) =>
                          upsert(category.key, index, { course_name: e.target.value.trim() || null })
                        }
                      />
                      <Input
                        className="w-20"
                        placeholder="Grade"
                        maxLength={4}
                        defaultValue={row?.grade ?? ""}
                        onBlur={(e) =>
                          upsert(category.key, index, { grade: e.target.value.trim() || null })
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
