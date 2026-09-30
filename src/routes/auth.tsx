import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign In — RiseUp Hoops" },
      {
        name: "description",
        content: "Sign in to build and share your basketball scout profile with college coaches.",
      },
      { property: "og:title", content: "Sign In — RiseUp Hoops" },
      { property: "og:description", content: "Access your scout profile and recruitment tools." },
    ],
  }),
  component: AuthPage,
});

const LOVABLE_HOST = /(\.lovable\.app|\.lovableproject\.com|lovable\.dev)$/;

// Off Lovable hosting, Google login goes straight to Supabase, which rejects it
// ("missing OAuth secret") until a Google Client ID/Secret is added there.
// Set VITE_GOOGLE_AUTH_ENABLED=true once those credentials are configured.
function isGoogleAvailable() {
  if (typeof window === "undefined") return false;
  return (
    LOVABLE_HOST.test(window.location.hostname) ||
    import.meta.env["VITE_GOOGLE_AUTH_ENABLED"] === "true"
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [googleAvailable] = useState(isGoogleAvailable);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (signUpError) setError(signUpError.message);
      else if (data.session) navigate({ to: "/dashboard" });
      else setMessage("Check your email to confirm your account, then sign in.");
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
      else navigate({ to: "/dashboard" });
    }
    setBusy(false);
  };

  const google = async () => {
    setError(null);

    // Lovable's OAuth broker (/~oauth/initiate) only exists on Lovable hosting;
    // everywhere else (Vercel, v0 preview) it 404s, so use Supabase OAuth directly.
    const onLovableHost = LOVABLE_HOST.test(window.location.hostname);
    if (!onLovableHost) {
  // Google refuses to load inside iframes ("This content is blocked"), so when the
  // app is embedded (e.g. a preview window) open the Google page in a new tab.
  const inIframe = window.self !== window.top;
  const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
  redirectTo: `${window.location.origin}/dashboard`,
  skipBrowserRedirect: true,
  },
  });
  if (oauthError || !data?.url) {
  setError("Google sign-in failed. Try email and password instead.");
  return;
  }
  if (inIframe) {
  const popup = window.open(data.url, "_blank", "noopener,noreferrer");
  if (!popup) {
  try {
  window.top!.location.href = data.url;
  } catch {
  setError("Your browser blocked the Google window. Allow pop-ups or open the site in a new tab.");
  }
  }
  return;
  }
  window.location.assign(data.url);
  return;
    }

    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Google sign-in failed. Try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <h1 className="text-4xl">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your scout profile lives on your account so you can update it any time.
      </p>

      <form onSubmit={submit} className="card-elevated mt-6 space-y-4 p-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-success">{message}</p>}

        <Button type="submit" variant="hero" className="w-full" disabled={busy}>
          {mode === "signin" ? "Sign in" : "Sign up"}
        </Button>

        {googleAvailable && (
          <Button type="button" variant="court" className="w-full" onClick={google}>
            Continue with Google
          </Button>
        )}
      </form>

      <button
        type="button"
        className="mt-5 cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:underline"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setMessage(null);
        }}
      >
        {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </main>
  );
}
