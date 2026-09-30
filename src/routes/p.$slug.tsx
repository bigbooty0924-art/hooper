import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Play, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatHeight, formatWeight, pct } from "@/lib/scout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/p/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Player Card — RiseUp Hoops" },
      {
        name: "description",
        content:
          "An interactive player trading card: bio, athletic vitals, verified 30-day shooting stats and highlight tape.",
      },
      { property: "og:title", content: "Player Card — RiseUp Hoops" },
      {
        property: "og:description",
        content: "Flip the card for vitals, verified shooting stats and highlight film.",
      },
    ],
  }),
  component: PublicProfile,
});

type ProfileRow = {
  id: string;
  slug: string;
  full_name: string;
  class_year: number | null;
  height_inches: number | null;
  weight_lbs: number | null;
  wingspan_inches: number | null;
  position: string | null;
  high_school_team: string | null;
  aau_team: string | null;
  jersey_number: string | null;
  head_coach_name: string | null;
  head_coach_email: string | null;
  head_coach_phone: string | null;
  avatar_url: string | null;
};

type MediaRow = { id: string; title: string; url: string };

type Stats = {
  ft_pct: number | null;
  ft_makes: number;
  ft_attempts: number;
  three_pct: number | null;
  three_makes: number;
  three_attempts: number;
  sessions_logged: number;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function PublicProfile() {
  const { slug } = Route.useParams();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("scout_profiles")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!active) return;
      setProfile((data as ProfileRow) ?? null);

      if (data) {
        const [{ data: mediaRows }, { data: statRows }] = await Promise.all([
          supabase.from("profile_media").select("id, title, url").eq("profile_id", data.id),
          supabase.rpc("scout_profile_shooting_stats", { p_slug: slug }),
        ]);
        if (!active) return;
        setMedia((mediaRows as MediaRow[]) ?? []);
        setStats(((statRows as unknown as Stats[]) ?? [])[0] ?? null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading card…
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="text-4xl">Card not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link may have been removed or set to private.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary underline-offset-4 hover:underline">
          Go to RiseUp Hoops
        </Link>
      </main>
    );
  }

  const tape =
    media.find((m) => /youtube\.com|youtu\.be/i.test(m.url)) ??
    media.find((m) => /hudl\.com/i.test(m.url)) ??
    media[0];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
      <PlayerCard profile={profile} stats={stats} tape={tape} />
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Tap the card to flip
      </p>
      {media.length > 1 && (
        <ul className="flex flex-wrap justify-center gap-3 text-sm">
          {media.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary underline-offset-4 hover:underline"
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function PlayerCard({
  profile,
  stats,
  tape,
}: {
  profile: ProfileRow;
  stats: Stats | null;
  tape: MediaRow | undefined;
}) {
  const [flipped, setFlipped] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const springX = useSpring(mx, { stiffness: 150, damping: 20 });
  const springY = useSpring(my, { stiffness: 150, damping: 20 });
  const rotateY = useTransform(springX, [0, 1], [-14, 14]);
  const rotateX = useTransform(springY, [0, 1], [12, -12]);
  const shimmerX = useTransform(springX, [0, 1], ["0%", "100%"]);
  const shimmerY = useTransform(springY, [0, 1], ["0%", "100%"]);

  const onMove = (event: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((event.clientX - rect.left) / rect.width);
    my.set((event.clientY - rect.top) / rect.height);
  };

  const reset = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <div style={{ perspective: 1400 }}>
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        onClick={() => setFlipped((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-label="Flip player card"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((prev) => !prev);
          }
        }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative h-[520px] w-[330px] cursor-pointer select-none outline-none sm:h-[580px] sm:w-[380px]"
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="relative size-full"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <CardFace className="bg-[image:var(--gradient-primary)]">
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-70 mix-blend-overlay"
              style={{
                background: useTransform(
                  [shimmerX, shimmerY],
                  ([x, y]) =>
                    `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.55), transparent 55%)`,
                ),
              }}
            />
            <div className="relative flex h-full flex-col justify-between p-6 text-primary-foreground">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.3em]">
                  {profile.position ?? "Player"}
                </span>
                <span className="font-display text-6xl leading-none">
                  {profile.jersey_number ? `#${profile.jersey_number}` : ""}
                </span>
              </div>

              <div className="flex justify-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="size-44 rounded-full border-4 border-primary-foreground/60 object-cover shadow-[var(--shadow-card)]"
                  />
                ) : (
                  <div className="flex size-44 items-center justify-center rounded-full border-4 border-primary-foreground/60 bg-background/25 font-display text-6xl">
                    {initials(profile.full_name)}
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-4xl leading-none sm:text-5xl">{profile.full_name}</h1>
                <p className="mt-2 text-sm font-semibold uppercase tracking-widest opacity-90">
                  {[
                    profile.class_year ? `Class of ${profile.class_year}` : null,
                    profile.high_school_team,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] opacity-80">
                  <RotateCw className="size-3" /> Tap to flip
                </p>
              </div>
            </div>
          </CardFace>

          {/* Back */}
          <CardFace
            className="bg-card"
            style={{ transform: "rotateY(180deg)" }}
          >
            <div className="flex h-full flex-col gap-4 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                  Athletic vitals
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Vital label="Height" value={formatHeight(profile.height_inches)} />
                  <Vital label="Weight" value={formatWeight(profile.weight_lbs)} />
                  <Vital label="Wingspan" value={formatHeight(profile.wingspan_inches)} />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                  Verified 30-day shooting
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Vital
                    label="Free throw"
                    value={pct(stats?.ft_pct ?? null)}
                    hint={stats ? `${stats.ft_makes}/${stats.ft_attempts}` : ""}
                    big
                  />
                  <Vital
                    label="3-point"
                    value={pct(stats?.three_pct ?? null)}
                    hint={stats ? `${stats.three_makes}/${stats.three_attempts}` : ""}
                    big
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Tracked in-app from {stats?.sessions_logged ?? 0} logged drill sessions.
                </p>
              </div>

              <div className="space-y-1 text-sm">
                <Row label="High school" value={profile.high_school_team} />
                <Row label="AAU" value={profile.aau_team} />
                <Row label="Head coach" value={profile.head_coach_name} />
                <Row label="Coach email" value={profile.head_coach_email} />
                <Row label="Coach phone" value={profile.head_coach_phone} />
              </div>

              <div className="mt-auto">
                {tape ? (
                  <Button variant="hero" size="lg" className="w-full" asChild>
                    <a
                      href={tape.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Play /> Watch highlight tape
                    </a>
                  </Button>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">
                    No highlight tape added yet.
                  </p>
                )}
              </div>
            </div>
          </CardFace>
        </motion.div>
      </motion.div>
    </div>
  );
}

function CardFace({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-glow)] ${className}`}
      style={{ backfaceVisibility: "hidden", ...style }}
    >
      {children}
    </div>
  );
}

function Vital({
  label,
  value,
  hint,
  big,
}: {
  label: string;
  value: string;
  hint?: string;
  big?: boolean;
}) {
  return (
    <div className="rounded-lg bg-secondary px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`font-display leading-none ${big ? "mt-1 text-3xl text-primary" : "mt-1 text-xl"}`}>
        {value}
      </p>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="truncate text-right">{value || "—"}</span>
    </div>
  );
}
