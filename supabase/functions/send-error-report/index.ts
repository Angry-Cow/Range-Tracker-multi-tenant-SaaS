import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

async function sendViaSmtp(opts: {
  name: string;
  email: string;
  description: string;
  internalError: string;
  errorStep: string;
  source: string;
  reportId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const smtpHost = Deno.env.get("SMTP_HOST") || "mail.rangetracker.net";
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
  const smtpUser = Deno.env.get("SMTP_USER") || "accounts@rangetracker.net";
  const smtpPass = Deno.env.get("SMTP_PASS") || "";
  const smtpFrom = Deno.env.get("SMTP_FROM") || "accounts@rangetracker.net";
  const to = "info@rangetracker.net";

  const subject = `Support Report - ${opts.name || "Unknown"} [${opts.source || "unknown"}]`;

  const plain = [
    `Support Report ID: ${opts.reportId}`,
    `Source: ${opts.source || "(not specified)"}`,
    `Name: ${opts.name || "(not specified)"}`,
    `Email: ${opts.email || "(not specified)"}`,
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

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.6; max-width: 600px; margin: 0; padding: 20px;">
  <p style="margin: 0 0 16px 0;"><strong>Support Report</strong></p>
  <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;">
    <tr><td style="padding: 4px 8px 4px 0; font-weight: bold; white-space: nowrap;">Report ID:</td><td style="padding: 4px 0;">${opts.reportId}</td></tr>
    <tr><td style="padding: 4px 8px 4px 0; font-weight: bold; white-space: nowrap;">Source:</td><td style="padding: 4px 0;">${opts.source || "(not specified)"}</td></tr>
    <tr><td style="padding: 4px 8px 4px 0; font-weight: bold; white-space: nowrap;">Name:</td><td style="padding: 4px 0;">${opts.name || "(not specified)"}</td></tr>
    <tr><td style="padding: 4px 8px 4px 0; font-weight: bold; white-space: nowrap;">Email:</td><td style="padding: 4px 0;">${opts.email || "(not specified)"}</td></tr>
    <tr><td style="padding: 4px 8px 4px 0; font-weight: bold; white-space: nowrap;">Timestamp:</td><td style="padding: 4px 0;">${new Date().toISOString()}</td></tr>
  </table>
  <p style="margin: 0 0 4px 0;"><strong>User Description:</strong></p>
  <p style="margin: 0 0 16px 0; white-space: pre-wrap;">${opts.description || "(no description provided)"}</p>
  <p style="margin: 0 0 4px 0;"><strong>Failed Step:</strong></p>
  <p style="margin: 0 0 16px 0; white-space: pre-wrap;">${opts.errorStep || "(not captured)"}</p>
  <p style="margin: 0 0 4px 0;"><strong>Internal Error:</strong></p>
  <p style="margin: 0; white-space: pre-wrap;">${opts.internalError || "(none captured)"}</p>
</body>
</html>`;

  const boundary = "----=_Part_RangeTracker_" + Date.now();
  const multipartBody = `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${plain}\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}\r\n--${boundary}--`;

  try {
    const conn = await Deno.connect({ hostname: smtpHost, port: smtpPort, transport: "tcp" });
    const tlsConn = await Deno.startTls(conn, { hostname: smtpHost });
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function readLine(c: Deno.TlsConn): Promise<string> {
      const buf = new Uint8Array(4096);
      let result = "";
      while (true) {
        const n = await c.read(buf);
        if (n === null) break;
        result += decoder.decode(buf.subarray(0, n));
        if (result.includes("\r\n")) break;
      }
      return result;
    }

    async function send(c: Deno.TlsConn, data: string): Promise<string> {
      await c.write(encoder.encode(data + "\r\n"));
      return await readLine(c);
    }

    await readLine(tlsConn);
    await send(tlsConn, `EHLO rangetracker.net`);
    await send(tlsConn, `AUTH LOGIN`);
    await send(tlsConn, btoa(smtpUser));
    await send(tlsConn, btoa(smtpPass));
    await send(tlsConn, `MAIL FROM:<${smtpFrom}>`);
    await send(tlsConn, `RCPT TO:<${to}>`);
    await send(tlsConn, `DATA`);
    await send(tlsConn, `From: Range Tracker <${smtpFrom}>\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n${multipartBody}\r\n.`);
    await send(tlsConn, `QUIT`);
    tlsConn.close();
    return { ok: true };
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

    EdgeRuntime.waitUntil((async () => {
      const result = await sendViaSmtp({
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
            email_error: result.ok ? null : (result as { ok: false; error: string }).error,
            email_attempted_at: new Date().toISOString(),
          })
          .eq("id", reportId);
      } catch {
        /* background task - swallow update errors */
      }
    })());

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
