import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AccountButton() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (email === undefined) return null;

  if (!email) {
    return (
      <Button variant="hero" size="sm" asChild>
        <Link to="/auth">
          <LogIn aria-hidden="true" />
          Sign in
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant="court"
      size="sm"
      title={email}
      onClick={async () => {
        await supabase.auth.signOut();
        queryClient.clear();
        navigate({ to: "/auth" });
      }}
    >
      <LogOut aria-hidden="true" />
      Sign out
    </Button>
  );
}
