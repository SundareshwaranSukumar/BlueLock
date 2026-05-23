import { createFileRoute } from "@tanstack/react-router";
import { corsOptions, proxyPostToBackend, shouldProxyToBackend } from "@/lib/backend-proxy";
import { z } from "zod";

const Schema = z.object({
  userId: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(800),
  currentGate: z.string().trim().max(20).optional(),
  userLocationContext: z.string().trim().max(200).optional(),
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SYSTEM = `You are BlueLock Concierge — the on-stadium AI for Ekana Cricket Stadium, Lucknow.
Be concise (max 2 short sentences). Always end with a JSON line of the form:
{"suggestedAction":"REDIRECT"|"STAY"|"PROCEED","targetGate":"A"|"B"|"C"|"D"|null}
Gates: A=North Block, B=South Block, C=East Lounge, D=West Terrace.
If user mentions overcrowding or "rush", prefer REDIRECT to a quieter gate.
If they ask "where do I go", prefer PROCEED with their currentGate.
If they ask to wait or rest, STAY with targetGate:null.`;

function extractJSONTail(text: string): {
  reply: string;
  meta: {
    suggestedAction: "REDIRECT" | "STAY" | "PROCEED";
    targetGate: "A" | "B" | "C" | "D" | null;
  };
} {
  const match = text.match(/\{[\s\S]*\}\s*$/);
  let meta: {
    suggestedAction: "REDIRECT" | "STAY" | "PROCEED";
    targetGate: "A" | "B" | "C" | "D" | null;
  } = { suggestedAction: "PROCEED", targetGate: null };
  let reply = text;
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed.suggestedAction)
        meta = { suggestedAction: parsed.suggestedAction, targetGate: parsed.targetGate ?? null };
      reply = text.slice(0, match.index).trim();
    } catch {
      /* keep as-is */
    }
  }
  return { reply, meta };
}

export const Route = createFileRoute("/api/v1/ai/stadium-assistant")({
  server: {
    handlers: {
      OPTIONS: async () => corsOptions(),
      POST: async ({ request }) => {
        if (shouldProxyToBackend()) {
          return proxyPostToBackend(request, "/api/v1/ai/stadium-assistant");
        }
        try {
          const parsed = Schema.safeParse(await request.json());
          if (!parsed.success) {
            return new Response(JSON.stringify({ error: "Invalid payload" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...cors },
            });
          }
          const { message, currentGate, userLocationContext } = parsed.data;
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(
              JSON.stringify({
                replyText:
                  "Concierge offline — set GEMINI via backend (VITE_USE_BACKEND=true) or LOVABLE_API_KEY.",
                suggestedAction: "STAY",
              }),
              { status: 200, headers: { "Content-Type": "application/json", ...cors } },
            );
          }

          const userMsg = `Context — currentGate:${currentGate ?? "unknown"}, location:${userLocationContext ?? "unknown"}.\nUser: ${message}`;
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: SYSTEM },
                { role: "user", content: userMsg },
              ],
            }),
          });

          if (aiRes.status === 429) {
            return new Response(
              JSON.stringify({
                replyText: "Concierge is rate-limited. Try again shortly.",
                suggestedAction: "STAY",
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json", ...cors },
              },
            );
          }
          if (!aiRes.ok) {
            return new Response(
              JSON.stringify({ replyText: "Concierge upstream error.", suggestedAction: "STAY" }),
              {
                status: 200,
                headers: { "Content-Type": "application/json", ...cors },
              },
            );
          }
          const data = (await aiRes.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = data.choices?.[0]?.message?.content ?? "Standby.";
          const { reply, meta } = extractJSONTail(content);

          return new Response(
            JSON.stringify({
              replyText: reply || content,
              suggestedAction: meta.suggestedAction,
              targetGate: meta.targetGate ?? undefined,
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...cors } },
          );
        } catch {
          return new Response(
            JSON.stringify({ replyText: "Concierge unreachable.", suggestedAction: "STAY" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...cors },
            },
          );
        }
      },
    },
  },
});
