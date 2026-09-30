import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const Body = z.object({
  goals: z.string().trim().min(3).max(1500),
  level: z.string().max(40).optional(),
  daysPerWeek: z.number().int().min(1).max(7),
  notes: z.string().max(1000).optional(),
});

const RUN_HEADER = "X-Lovable-AIG-Run-ID";

export const Route = createFileRoute("/api/training-plan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Please sign in first.", { status: 401 });

        const supabase = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Please sign in first.", { status: 401 });

        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Please describe your goals (at least a few words).", { status: 400 });
        const { goals, level, daysPerWeek, notes } = parsed.data;

        const since = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data: sessions } = await supabase
          .from("drill_sessions")
          .select("drill_type, attempts, makes, performed_at")
          .gte("performed_at", since)
          .order("performed_at", { ascending: false })
          .limit(60);

        const history =
          sessions && sessions.length
            ? sessions
                .map(
                  (s) =>
                    `${s.performed_at.slice(0, 10)} ${s.drill_type === "free_throw" ? "Free throws" : "3-pointers"}: ${s.makes}/${s.attempts} (${Math.round((s.makes / Math.max(1, s.attempts)) * 100)}%)`,
                )
                .join("\n")
            : "No drills logged in the last 30 days.";

        const prompt = `Player goals: ${goals}
Grade / level: ${level || "not given"}
Training days available per week: ${daysPerWeek}
Extra notes (injuries, equipment, schedule): ${notes || "none"}

Drill history (last 30 days):
${history}

Create a personalized 7-day basketball training plan. Use Markdown: a short "Focus this week" summary referencing their stats, then one "### Day N — Theme" section per day (rest/recovery on non-training days) with 3-5 bullet drills including reps, targets, and time. End with "### Weekly targets" giving measurable FT% and 3PT% goals. Keep it under 600 words, age-appropriate and safe.`;

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("AI is not configured.", { status: 500 });

        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
            method: "POST",
            signal: request.signal,
            headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
            body: JSON.stringify({
              model: "openai/gpt-6-astra",
              instructions:
                "You are an experienced youth basketball skills coach. Build practical, encouraging, data-informed weekly plans.",
              input: prompt,
              stream: true,
              store: false,
              reasoning: { effort: "low", summary: "auto" },
              include: ["reasoning.encrypted_content"],
            }),
          });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw e;
        }

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          let msg = "The coach AI couldn't build a plan right now. Please try again later.";
          if (upstream.status === 429) msg = "Too many requests — please wait a minute and try again.";
          if (upstream.status === 402) msg = "AI credits have run out for this app.";
          try {
            const j = JSON.parse(text);
            if (upstream.status === 402 || upstream.status === 403) msg = j?.error?.message ?? j?.message ?? msg;
          } catch {}
          return new Response(msg, { status: upstream.status });
        }

        // Convert the SSE stream into a plain-text stream of answer deltas.
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";
        const out = upstream.body.pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              buffer += decoder.decode(chunk, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if (!data || data === "[DONE]") continue;
                try {
                  const evt = JSON.parse(data);
                  if (evt.type === "response.output_text.delta" && evt.delta) controller.enqueue(encoder.encode(evt.delta));
                  if (evt.type === "response.failed" || evt.type === "error")
                    controller.enqueue(encoder.encode("\n\n_The plan was interrupted. Please try again._"));
                } catch {}
              }
            },
          }),
        );

        const headers = new Headers({ "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" });
        const runId = upstream.headers.get(RUN_HEADER);
        if (runId) headers.set(RUN_HEADER, runId);
        return new Response(out, { headers });
      },
    },
  },
});
