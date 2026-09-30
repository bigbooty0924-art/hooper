import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Copy, Check, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { POSITIONS, formatHeight, pct } from "@/lib/scout";

export const Route = createFileRoute("/_authenticated/scout-profile")({
  head: () => ({
    meta: [
      { title: "My Scout Profile — RiseUp Hoops" },
      {
        name: "description",
        content:
          "Build the one link college coaches need: bio, teams, highlight film and tracked shooting percentages.",
      },
      { property: "og:title", content: "My Scout Profile — RiseUp Hoops" },
      {
        property: "og:description",
        content: "Edit your player bio, team info, film links and share your profile link.",
      },
    ],
  }),
  component: ScoutProfileEditor,
});

type Form = {
  avatar_url: string;
  full_name: string;
  class_year: string;
  height_inches: string;
  weight_lbs: string;
  wingspan_inches: string;
  position: string;
  high_school_team: string;
  aau_team: string;
  jersey_number: string;
  head_coach_name: string;
  head_coach_email: string;
  head_coach_phone: string;
};

const EMPTY: Form = {
  avatar_url: "",
  full_name: "",
  class_year: "",
  height_inches: "",
  weight_lbs: "",
  wingspan_inches: "",
  position: "",
  high_school_team: "",
  aau_team: "",
  jersey_number: "",
  head_coach_name: "",
  head_coach_email: "",
  head_coach_phone: "",
};

type Media = { id: string; title: string; url: string };

function num(value: string): number | null {
  const parsed = Number(value);
  return value.trim() === "" || Number.isNaN(parsed) ? null : parsed;
}

function ScoutProfileEditor() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [media, setMedia] = useState<Media[]>([]);
  const [stats, setStats] = useState<{ ft: number | null; three: number | null }>({
    ft: null,
    three: null,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadStats = useCallback(async (uid: string) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("drill_sessions")
      .select("drill_type, attempts, makes")
      .eq("user_id", uid)
      .gte("performed_at", since);
    const rows = data ?? [];
    const agg = (type: string) => {
      const filtered = rows.filter((r) => r.drill_type === type);
      const attempts = filtered.reduce((sum, r) => sum + r.attempts, 0);
      const makes = filtered.reduce((sum, r) => sum + r.makes, 0);
      return attempts ? Math.round((makes / attempts) * 1000) / 10 : null;
    };
    setStats({ ft: agg("free_throw"), three: agg("three_point") });
  }, []);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const { data: profile } = await supabase
        .from("scout_profiles")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      if (profile) {
        setProfileId(profile.id);
        setSlug(profile.slug);
        setForm({
          avatar_url: profile.avatar_url ?? "",
          full_name: profile.full_name ?? "",
          class_year: profile.class_year?.toString() ?? "",
          height_inches: profile.height_inches?.toString() ?? "",
          weight_lbs: profile.weight_lbs?.toString() ?? "",
          wingspan_inches: profile.wingspan_inches?.toString() ?? "",
          position: profile.position ?? "",
          high_school_team: profile.high_school_team ?? "",
          aau_team: profile.aau_team ?? "",
          jersey_number: profile.jersey_number ?? "",
          head_coach_name: profile.head_coach_name ?? "",
          head_coach_email: profile.head_coach_email ?? "",
          head_coach_phone: profile.head_coach_phone ?? "",
        });
        const { data: mediaRows } = await supabase
          .from("profile_media")
          .select("id, title, url")
          .eq("profile_id", profile.id);
        setMedia((mediaRows as Media[]) ?? []);
      }
      await loadStats(uid);
    })();
  }, [loadStats]);

  const set = (key: keyof Form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId) return;
    setError(null);
    setStatus(null);

    const payload = {
      user_id: userId,
      avatar_url: form.avatar_url.trim().startsWith("https://") ? form.avatar_url.trim() : null,
      full_name: form.full_name.trim().slice(0, 100),
      class_year: num(form.class_year),
      height_inches: num(form.height_inches),
      weight_lbs: num(form.weight_lbs),
      wingspan_inches: num(form.wingspan_inches),
      position: form.position.trim() || null,
      high_school_team: form.high_school_team.trim() || null,
      aau_team: form.aau_team.trim() || null,
      jersey_number: form.jersey_number.trim() || null,
      head_coach_name: form.head_coach_name.trim() || null,
      head_coach_email: form.head_coach_email.trim() || null,
      head_coach_phone: form.head_coach_phone.trim() || null,
    };

    if (!payload.full_name) {
      setError("Full name is required.");
      return;
    }

    const { data, error: saveError } = await supabase
      .from("scout_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("id, slug")
      .single();

    if (saveError) {
      setError(saveError.message);
      return;
    }
    setProfileId(data.id);
    setSlug(data.slug);
    setStatus("Profile saved.");
  };

  const shareUrl = slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${slug}` : "";

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Recruitment
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl">My Scout Profile</h1>
        </div>
        <Button variant="court" size="sm" asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      {slug && (
        <section className="card-elevated mt-6 flex flex-wrap items-center gap-3 border-l-4 border-l-primary p-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Your shareable link
            </p>
            <p className="mt-1 truncate text-sm">{shareUrl}</p>
          </div>
          <Button
            variant="hero"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button variant="court" size="sm" asChild>
            <a href={shareUrl} target="_blank" rel="noreferrer noopener">
              Preview <ExternalLink />
            </a>
          </Button>
        </section>
      )}

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <StatTile label="Free throw % (last 30 days)" value={pct(stats.ft)} />
        <StatTile label="3-point % (last 30 days)" value={pct(stats.three)} />
      </section>

      <form onSubmit={save} className="mt-6 space-y-6">
        <fieldset className="card-elevated p-6">
          <legend className="px-2 font-display text-2xl">Player bio</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={form.full_name} onChange={set("full_name")} required />
            <Field
              label="Photo link"
              value={form.avatar_url}
              onChange={set("avatar_url")}
              placeholder="https://…"
              hint="Used on your public card; initials show if empty"
            />
            <Field
              label="Class year"
              type="number"
              value={form.class_year}
              onChange={set("class_year")}
              placeholder="2028"
            />
            <Field
              label="Height (inches)"
              type="number"
              value={form.height_inches}
              onChange={set("height_inches")}
              hint={formatHeight(Number(form.height_inches) || null)}
            />
            <Field
              label="Weight (lbs)"
              type="number"
              value={form.weight_lbs}
              onChange={set("weight_lbs")}
            />
            <Field
              label="Wingspan (inches)"
              type="number"
              value={form.wingspan_inches}
              onChange={set("wingspan_inches")}
              hint={formatHeight(Number(form.wingspan_inches) || null)}
            />
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                list="positions"
                value={form.position}
                onChange={set("position")}
                placeholder="Point Guard"
              />
              <datalist id="positions">
                {POSITIONS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>
        </fieldset>

        <fieldset className="card-elevated p-6">
          <legend className="px-2 font-display text-2xl">Team info</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="High school team"
              value={form.high_school_team}
              onChange={set("high_school_team")}
            />
            <Field label="AAU team" value={form.aau_team} onChange={set("aau_team")} />
            <Field
              label="Jersey number"
              value={form.jersey_number}
              onChange={set("jersey_number")}
            />
            <Field
              label="Head coach name"
              value={form.head_coach_name}
              onChange={set("head_coach_name")}
            />
            <Field
              label="Head coach email"
              type="email"
              value={form.head_coach_email}
              onChange={set("head_coach_email")}
            />
            <Field
              label="Head coach phone"
              value={form.head_coach_phone}
              onChange={set("head_coach_phone")}
            />
          </div>
        </fieldset>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {status && <p className="text-sm text-success">{status}</p>}

        <Button type="submit" variant="hero" size="lg">
          Save profile
        </Button>
      </form>

      {profileId && (
        <>
          <MediaManager profileId={profileId} media={media} setMedia={setMedia} />
          <DrillLogger userId={userId!} onLogged={() => userId && loadStats(userId)} />
        </>
      )}
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-elevated p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-5xl leading-none text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">Calculated from your drill history</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        maxLength={120}
      />
      {hint && hint !== "—" && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function MediaManager({
  profileId,
  media,
  setMedia,
}: {
  profileId: string;
  media: Media[];
  setMedia: React.Dispatch<React.SetStateAction<Media[]>>;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      setError("Enter a full link, starting with https://");
      return;
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      setError("Only web links are allowed.");
      return;
    }
    const { data, error: insertError } = await supabase
      .from("profile_media")
      .insert({ profile_id: profileId, title: title.trim().slice(0, 100) || "Highlight reel", url: parsed.toString() })
      .select("id, title, url")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setMedia((prev) => [...prev, data as Media]);
    setTitle("");
    setUrl("");
  };

  const remove = async (id: string) => {
    await supabase.from("profile_media").delete().eq("id", id);
    setMedia((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <section className="card-elevated mt-6 p-6">
      <h2 className="text-2xl">Highlight reels</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Paste YouTube or Hudl links. Coaches watch film first.
      </p>
      <ul className="mt-4 space-y-2">
        {media.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer noopener"
              className="truncate text-sm text-primary underline-offset-4 hover:underline"
            >
              {item.title}
            </a>
            <Button variant="ghost" size="icon" onClick={() => remove(item.id)} aria-label="Remove link">
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Junior season mixtape"
          maxLength={100}
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hudl.com/..."
          maxLength={500}
          required
        />
        <Button type="submit" variant="court">
          Add link
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}

function DrillLogger({ userId, onLogged }: { userId: string; onLogged: () => void }) {
  const [drillType, setDrillType] = useState<"free_throw" | "three_point">("free_throw");
  const [attempts, setAttempts] = useState("");
  const [makes, setMakes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const log = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const a = Number(attempts);
    const m = Number(makes);
    if (!a || a < 1 || m < 0 || m > a) {
      setError("Makes must be between 0 and your attempts.");
      return;
    }
    const { error: insertError } = await supabase
      .from("drill_sessions")
      .insert({ user_id: userId, drill_type: drillType, attempts: a, makes: m });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setAttempts("");
    setMakes("");
    onLogged();
  };

  return (
    <section className="card-elevated mt-6 p-6">
      <h2 className="text-2xl">Log a shooting drill</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Every session feeds the 30-day percentages coaches see on your profile.
      </p>
      <form onSubmit={log} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          {(["free_throw", "three_point"] as const).map((type) => (
            <Button
              key={type}
              type="button"
              variant={drillType === type ? "hero" : "court"}
              size="sm"
              onClick={() => setDrillType(type)}
            >
              {type === "free_throw" ? "Free throws" : "3-pointers"}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="attempts">Attempts</Label>
          <Input
            id="attempts"
            type="number"
            min={1}
            className="w-28"
            value={attempts}
            onChange={(e) => setAttempts(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="makes">Makes</Label>
          <Input
            id="makes"
            type="number"
            min={0}
            className="w-28"
            value={makes}
            onChange={(e) => setMakes(e.target.value)}
            required
          />
        </div>
        <Button type="submit" variant="hero">
          Log session
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}
