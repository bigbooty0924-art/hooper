import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GRADES, type Grade, loadGrade, saveGrade, tierForGrade } from "@/lib/grade";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Get Started — RiseUp Hoops" },
      {
        name: "description",
        content:
          "Tell us your grade level and RiseUp Hoops builds your training path — skill foundation drills or the full D1 recruitment suite.",
      },
      { property: "og:title", content: "Get Started — RiseUp Hoops" },
      {
        property: "og:description",
        content: "Pick your grade level to unlock the right basketball development track.",
      },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Grade | null>(null);

  useEffect(() => {
    const existing = loadGrade();
    if (existing) setSelected(existing);
  }, []);

  const tier = selected ? tierForGrade(selected) : null;

  const handleContinue = () => {
    if (!selected) return;
    saveGrade(selected);
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-5 py-14">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
        RiseUp Hoops
      </p>
      <h1 className="mt-3 text-5xl leading-none sm:text-6xl">
        What grade are <span className="text-gradient">you in?</span>
      </h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Your grade level sets your track. Middle school players build a skill foundation. High
        school players get the full D1 recruitment suite.
      </p>

      <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {GRADES.map((grade) => {
          const active = selected === grade;
          return (
            <button
              key={grade}
              type="button"
              onClick={() => setSelected(grade)}
              aria-pressed={active}
              className={`card-elevated flex cursor-pointer flex-col items-center gap-1 px-4 py-6 transition-[var(--transition-smooth)] ${
                active
                  ? "border-primary bg-accent shadow-[var(--shadow-glow)]"
                  : "hover:border-primary/60"
              }`}
            >
              <span className="font-display text-4xl leading-none">{grade}</span>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Grade
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 min-h-24">
        {tier === "foundation" && (
          <TrackNote
            title="Skill Foundation Track"
            body="Drill consistency, streaks and fundamentals. NCAA recruitment tools stay locked until 9th grade — that's when eligibility actually starts counting."
          />
        )}
        {tier === "recruitment" && (
          <TrackNote
            title="D1 Recruitment Suite Unlocked"
            body="NCAA Eligibility Tracker, coach outreach templates and your shareable scout profile, on top of everything in skill training."
          />
        )}
      </div>

      <Button
        variant="hero"
        size="xl"
        className="mt-2 w-full sm:w-auto sm:self-start"
        disabled={!selected}
        onClick={handleContinue}
      >
        Enter my dashboard
      </Button>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/auth" className="font-semibold text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}

function TrackNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="card-elevated border-l-4 border-l-primary p-5">
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
