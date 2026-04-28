import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xkokzdza";

async function sendViaFormspree(opts: {
  name: string;
  email: string;
  description: string;
  internalError: string;
  errorStep: string;
  source: string;
  reportId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const message = [
      `Support Report ID: ${opts.reportId}`,
      `Source: ${opts.source || "(not specified)"}`,
      ``,
      `User Description:`,
      opts.description || "(no description provided)",
      ``,
      `Failed Step:`,
      opts.errorStep || "(not captured)",
      ``,
      `Internal Error:`,
      opts.internalError || "(none captured)",
      ``,
      `Timestamp: ${new Date().toISOString()}`,
    ].join("\n");

    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        name: opts.name || "Unknown",
        email: opts.email || "no-email@rangetracker.net",
        message,
        _subject: `Support Report - ${opts.name || "Unknown"} [${opts.source || "unknown"}]`,
      }),
    });

    if (res.ok) {
      return { ok: true };
    }

    const errBody = await res.text().catch(() => `HTTP ${res.status}`);
    return { ok: false, error: `Formspree returned ${res.status}: ${errBody}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const ip = getClientIp(req);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("rate_limit_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("endpoint", "send-error-report")
      .gte("attempted_at", since);
    if ((count ?? 0) >= 10) {
      return json({ error: "Too many requests. Please try again later." }, 429);
    }
    await supabase.from("rate_limit_attempts").insert({ ip, endpoint: "send-error-report" });

    const { name, email, description, internalError, errorStep, source } = await req.json();

    const { data: inserted, error: insertErr } = await supabase
      .from("support_reports")
      .insert({
        name: name ?? "",
        email: email ?? "",
        description: description ?? "",
        internal_error: internalError ?? "",
        error_step: errorStep ?? "",
        source: source ?? "",
      })
      .select("id")
      .maybeSingle();

    if (insertErr || !inserted) {
      return json(
        { error: `Failed to record report: ${insertErr?.message ?? "unknown error"}` },
        500,
      );
    }

    const reportId = inserted.id as string;

    const emailTask = (async () => {
      const result = await sendViaFormspree({
        name: name ?? "",
        email: email ?? "",
        description: description ?? "",
        internalError: internalError ?? "",
        errorStep: errorStep ?? "",
        source: source ?? "",
        reportId,
      });

      try {
        await supabase
          .from("support_reports")
          .update({
            email_sent: result.ok,
            email_error: result.ok ? null : result.error,
            email_attempted_at: new Date().toISOString(),
          })
          .eq("id", reportId);
      } catch {
        /* background task - swallow update errors */
      }
    })();

    try {
      // @ts-ignore - EdgeRuntime is available at runtime in Supabase Edge Functions
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(emailTask);
      }
    } catch {
      /* ignore if not available */
    }

    return json({
      data: {
        persisted: true,
        reportId,
        emailQueued: true,
      },
    });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
