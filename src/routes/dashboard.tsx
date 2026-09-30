import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Flame, Target, TrendingUp, ClipboardCheck, Mail, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  clearGrade,
  gradeLabel,
  isRecruitmentUnlocked,
  loadGrade,
  type Grade,
} from "@/lib/grade";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Dashboard — RiseUp Hoops" },
      {
        name: "description",
        content:
          "Track drill consistency, NCAA eligibility and coach outreach in one basketball development dashboard.",
      },
      { property: "og:title", content: "My Dashboard — RiseUp Hoops" },
      {
        property: "og:description",
        content: "Your personalized basketball training and recruitment dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [grade, setGrade] = useState<Grade | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = loadGrade();
    if (!stored) {
      navigate({ to: "/" });
      return;
    }
    setGrade(stored);
    setReady(true);
  }, [navigate]);

  if (!ready || !grade) return null;

  const unlocked = isRecruitmentUnlocked(grade);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {gradeLabel(grade)} · {unlocked ? "D1 Recruitment Suite" : "Skill Foundation"}
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl">
            {unlocked ? "Recruitment Command Center" : "Skill Foundation"}
          </h1>
        </div>
        <Button
          variant="court"
          size="sm"
          onClick={() => {
            clearGrade();
            navigate({ to: "/" });
          }}
        >
          Change grade level
        </Button>
      </header>

      <section className="card-elevated mt-8 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl">AI Weekly Training Plan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Share your goals and get a custom week built from your drill history.
          </p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/training-plan">Build my plan</Link>
        </Button>
      </section>

      {unlocked ? <RecruitmentSuite /> : <FoundationDashboard />}
    </main>
  );
}

/* ---------------- Skill Foundation (grades 6-8) ---------------- */

const DRILLS = [
  { name: "Form shooting — 100 makes", done: 5, goal: 6 },
  { name: "Two-ball dribbling", done: 4, goal: 6 },
  { name: "Free throws — 50 reps", done: 6, goal: 6 },
  { name: "Defensive slides", done: 3, goal: 6 },
];

function FoundationDashboard() {
  return (
    <div className="mt-8 space-y-8">
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Flame />} label="Day streak" value="12" hint="Longest: 21 days" />
        <StatCard icon={<Target />} label="Weekly consistency" value="78%" hint="18 of 24 drills" />
        <StatCard icon={<TrendingUp />} label="Drills this month" value="61" hint="+14 vs last month" />
      </section>

      <section className="card-elevated p-6">
        <h2 className="text-2xl">This week's drill plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Consistency beats intensity. Hit every drill six days a week.
        </p>
        <ul className="mt-5 space-y-4">
          {DRILLS.map((drill) => (
            <li key={drill.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{drill.name}</span>
                <span className="text-muted-foreground">
                  {drill.done}/{drill.goal}
                </span>
              </div>
              <Progress className="mt-2" value={(drill.done / drill.goal) * 100} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl">Unlocks in 9th grade</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          NCAA eligibility only starts tracking in high school. Keep building your base.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <LockedCard
            title="NCAA Eligibility Tracker"
            body="Core course progress, GPA and sliding scale checks."
          />
          <LockedCard
            title="Coach Outreach Templates"
            body="Intro emails, follow-ups and camp invites for college coaches."
          />
        </div>
      </section>

      <section className="card-elevated flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-2xl">Parent View</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Share a 6-digit code so a parent can follow your workouts and progress.
          </p>
        </div>
        <Button variant="court" asChild>
          <Link to="/parent-view">Invite a parent</Link>
        </Button>
      </section>
    </div>
  );
}

function LockedCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card-elevated relative overflow-hidden p-5 opacity-70">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lock className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-widest">Locked</span>
      </div>
      <h3 className="mt-3 text-xl">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

/* ---------------- D1 Recruitment Suite (grades 9-12) ---------------- */

const ELIGIBILITY = [
  { label: "NCAA Eligibility Center registered", done: true },
  { label: "10 of 16 core courses complete", done: true },
  { label: "Core-course GPA 3.1 (2.3 minimum)", done: true },
  { label: "Official transcript sent after junior year", done: false },
  { label: "Final amateurism certification", done: false },
];

const TEMPLATES = [
  {
    id: "intro",
    title: "Intro email to a college coach",
    body: `Coach [Last Name],

My name is [Full Name], a [class year] [position] at [High School] in [City, State]. I'm very interested in [College] and your program.

Height/Weight: [6'2" / 175]
GPA: [3.4] | Core courses complete: [12/16]
AAU: [Team Name] | Jersey [#]
Highlight reel: [link]

My next live events are [dates/locations]. I'd love to hear what you look for at my position.

Thank you for your time,
[Full Name] | [phone] | [email]`,
  },
  {
    id: "followup",
    title: "Follow-up after a game or camp",
    body: `Coach [Last Name],

Thanks for watching me at [event] on [date]. I finished with [stat line] and felt strongest [specific area].

Here's fresh film from that weekend: [link]

My updated GPA is [3.4] and my next event is [event/date]. I'd welcome any feedback on what to improve before then.

[Full Name] | [phone]`,
  },
  {
    id: "visit",
    title: "Unofficial visit request",
    body: `Coach [Last Name],

I'll be near campus on [date] and would love to visit [College], see a practice, and meet the staff.

I'm a [class year] [position], [height], [GPA] GPA, currently [X/16] core courses complete. Film: [link]

Would that date work for your staff?

[Full Name] | [phone]`,
  },
];

function RecruitmentSuite() {
  const completed = ELIGIBILITY.filter((item) => item.done).length;

  return (
    <div className="mt-8 space-y-8">
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<ClipboardCheck />} label="Eligibility steps" value={`${completed}/${ELIGIBILITY.length}`} hint="On track" />
        <StatCard icon={<Mail />} label="Coaches contacted" value="14" hint="5 replied" />
        <StatCard icon={<Flame />} label="Day streak" value="12" hint="Drills logged" />
      </section>

      <section className="card-elevated p-6">
        <h2 className="text-2xl">NCAA Eligibility Tracker</h2>
        <Progress className="mt-4" value={(completed / ELIGIBILITY.length) * 100} />
        <ul className="mt-5 space-y-3">
          {ELIGIBILITY.map((item) => (
            <li key={item.label} className="flex items-start gap-3 text-sm">
              <span
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                  item.done
                    ? "border-success bg-success text-success-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {item.done ? <Check className="size-3" /> : null}
              </span>
              <span className={item.done ? "" : "text-muted-foreground"}>{item.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl">Coach Outreach Templates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Copy, fill the brackets, and send. Keep it short and specific.
        </p>
        <div className="mt-4 space-y-4">
          {TEMPLATES.map((template) => (
            <TemplateCard key={template.id} title={template.title} body={template.body} />
          ))}
        </div>
      </section>

      <section className="card-elevated flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-2xl">Scout Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One link with your bio, teams, film and shooting numbers to send college coaches.
          </p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/scout-profile">Build my profile</Link>
        </Button>
      </section>

      <section className="card-elevated flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-2xl">NCAA Compliance Checklist</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track all 16 core courses and learn exactly when coaches may contact you.
          </p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/ncaa-checklist">Open checklist</Link>
        </Button>
      </section>

      <section className="card-elevated flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-2xl">Parent View</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Share a 6-digit code so a parent can follow workouts, progress and grades.
          </p>
        </div>
        <Button variant="court" asChild>
          <Link to="/parent-view">Invite a parent</Link>
        </Button>
      </section>
    </div>
  );
}

function TemplateCard({ title, body }: { title: string; body: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card-elevated p-5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl">{title}</h3>
        <Button variant="court" size="sm" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
        {body}
      </pre>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="card-elevated p-5">
      <div className="flex items-center gap-2 text-primary [&_svg]:size-4">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <p className="mt-3 font-display text-4xl leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
