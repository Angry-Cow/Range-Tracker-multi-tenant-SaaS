import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import { corsHeaders, json } from "../_shared/cors.ts";

function validateSiteName(siteName: string): string | null {
  if (!siteName || siteName.length < 2) return "Site name must be at least 2 characters.";
  if (siteName.length > 63) return "Site name must be 63 characters or fewer.";
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(siteName) && !/^[a-z0-9]$/.test(siteName)) {
    return "Site name may only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.";
  }
  return null;
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function createJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const body = btoa(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const sig = await hmacSign(`${header}.${body}`, secret);
  return `${header}.${body}.${sig}`;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character.";
  return null;
}

async function sendSmtp(to: string, subject: string, htmlBody: string, plainBody: string): Promise<void> {
  const smtpHost = Deno.env.get("SMTP_HOST") || "mail.rangetracker.net";
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
  const smtpUser = Deno.env.get("SMTP_USER") || "accounts@rangetracker.net";
  const smtpPass = Deno.env.get("SMTP_PASS") || "";
  const smtpFrom = Deno.env.get("SMTP_FROM") || "accounts@rangetracker.net";
  const boundary = "----=_Part_RangeTracker_" + Date.now();
  const multipartBody = `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${plainBody}\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${htmlBody}\r\n--${boundary}--`;
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
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

async function sendWelcomeEmail(email: string, planType: string): Promise<void> {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.6; max-width: 600px; margin: 0; padding: 20px;">
  <p style="margin: 0 0 16px 0;">
    <strong>Welcome to the Range Tracker App.</strong> brought to you by <strong>T.O.L.R.<sup>&trade;</sup> Tools <span style="text-decoration: underline;">Of</span> Last Resort.</strong> <a href="https://tolr.net" style="color: #1155CC;">https://tolr.net</a>
  </p>
  <p style="margin: 0 0 16px 0;">
    Thank you for your interest in our service.&nbsp; We know you will find it as useful for tracking your range activities as we do.<br>
    Your account is registered with the <strong>${planType}</strong> program.
  </p>
  <p style="margin: 0 0 16px 0;">
    Your private Tracker is available at <strong><a href="https://rangetrackerapp.com" style="color: #1155CC;">rangetrackerapp.com</a></strong><br>
    Log in with the email and password you signed up with.
  </p>
  <p style="margin: 0 0 16px 0;">
    Thank you for selecting <strong>Range Tracker</strong> as your tool of choice!
  </p>
  <p style="margin: 0 0 16px 0;">
    <a href="https://eustespordcqqytqpvsx.supabase.co/storage/v1/object/public/range-photos/Range%20Tracker%20User%20Guide%20Mobile%20Edition%20Ver_00_02_35.pdf" style="color: #1155CC;">Download the Range Tracker&trade; Users Guide</a>
  </p>
  <p style="margin: 0;">
    Range Tracker Account Services<br>
    <a href="https://rangetrackerapp.com" style="color: #1155CC;">https://rangetrackerapp.com</a>
  </p>
</body>
</html>`;

  const plain = `Welcome to the Range Tracker App. brought to you by T.O.L.R.(tm) Tools Of Last Resort. https://tolr.net

Thank you for your interest in our service.  We know you will find it as useful for tracking your range activities as we do.
Your account is registered with the ${planType} program.

Your private Tracker is available at rangetrackerapp.com.
Log in with the email and password you signed up with.

Thank you for selecting Range Tracker as your tool of choice!

Download the Range Tracker(tm) Users Guide:
https://eustespordcqqytqpvsx.supabase.co/storage/v1/object/public/range-photos/Range%20Tracker%20User%20Guide%20Mobile%20Edition%20Ver_00_02_35.pdf

Range Tracker Account Services
https://rangetrackerapp.com`;

  await sendSmtp(email, "Your Range Tracker Application is Live", html, plain);
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  ip: string,
  endpoint: string,
  maxAttempts: number,
  windowMs: number
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count } = await supabase
    .from("rate_limit_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("endpoint", endpoint)
    .gte("attempted_at", since);

  if ((count ?? 0) >= maxAttempts) return false;

  await supabase.from("rate_limit_attempts").insert({ ip, endpoint });
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const jwtSecret = Deno.env.get("JWT_SECRET") || "range-tracker-secret-change-in-production";

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (req.method === "GET" && pathParts.includes("plans")) {
      const { data, error } = await supabase
        .from("plans")
        .select("id, plan_name, plan_price, token")
        .eq("show", 1)
        .order("plan_name");

      if (error) return json({ error: error.message }, 500);
      return json({ data, error: null });
    }

    if (req.method === "POST" && pathParts.includes("forgot-password")) {
      const { email } = await req.json();
      if (email) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("email")
          .eq("email", email)
          .eq("status", "active")
          .maybeSingle();

        if (tenant) {
          const token = crypto.randomUUID() + crypto.randomUUID();
          await supabase.from("tenant_password_reset_tokens").insert({ token, tenant_email: email });
          const appUrl = Deno.env.get("APP_URL") || "https://rangetrackerapp.com";
          const resetUrl = `${appUrl}/reset-password?token=${token}`;

          const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.6; max-width: 600px; margin: 0; padding: 20px;">
  <p style="margin: 0 0 16px 0;"><strong>Range Tracker — Password Reset</strong></p>
  <p style="margin: 0 0 16px 0;">A password reset was requested for your account. Click the link below to set a new password. This link expires in 1 hour.</p>
  <p style="margin: 0 0 16px 0;">
    <a href="${resetUrl}" style="color: #1155CC;">${resetUrl}</a>
  </p>
  <p style="margin: 0 0 16px 0;">If you did not request this, you can safely ignore this email.</p>
  <p style="margin: 0;">
    Range Tracker Account Services<br>
    <a href="https://rangetrackerapp.com" style="color: #1155CC;">https://rangetrackerapp.com</a>
  </p>
</body>
</html>`;

          const plain = `Range Tracker — Password Reset

A password reset was requested for your account. Visit the link below to set a new password. This link expires in 1 hour.

${resetUrl}

If you did not request this, you can safely ignore this email.

Range Tracker Account Services
https://rangetrackerapp.com`;

          EdgeRuntime.waitUntil(sendSmtp(email, "Range Tracker — Password Reset", html, plain));
        }
      }
      return json({ data: "If that address is registered, a reset link has been sent.", error: null });
    }

    if (req.method === "POST" && pathParts.includes("reset-password")) {
      const { token, newPassword } = await req.json();
      if (!token || !newPassword) return json({ error: "token and newPassword are required" }, 400);

      const passwordError = validatePassword(newPassword);
      if (passwordError) return json({ error: passwordError }, 400);

      const { data: record } = await supabase
        .from("tenant_password_reset_tokens")
        .select("id, tenant_email, used, created_at")
        .eq("token", token)
        .maybeSingle();

      if (!record) return json({ error: "Invalid or expired reset link" }, 400);
      if (record.used) return json({ error: "This reset link has already been used" }, 400);

      const ageMs = Date.now() - new Date(record.created_at).getTime();
      if (ageMs > 60 * 60 * 1000) return json({ error: "This reset link has expired" }, 400);

      const newHash = await bcrypt.hash(newPassword, 10);
      const { error: updateErr } = await supabase
        .from("tenants")
        .update({ password_hash: newHash })
        .eq("email", record.tenant_email);

      if (updateErr) return json({ error: updateErr.message }, 500);

      await supabase.from("tenant_password_reset_tokens").update({ used: true }).eq("id", record.id);
      return json({ data: "Password updated successfully", error: null });
    }

    if (req.method === "POST" && pathParts.includes("login")) {
      const { email, password } = await req.json();

      if (!email || !password) {
        return json({ error: "Email and password are required" }, 400);
      }

      const { data: tenant, error } = await supabase
        .from("tenants")
        .select("slug, status, token, password_hash")
        .eq("email", email)
        .maybeSingle();

      if (error) return json({ error: error.message }, 500);
      if (!tenant) return json({ data: null, error: null });

      if (!tenant.password_hash) {
        return json({ error: "Account not fully configured. Please contact the administrator." }, 403);
      }

      const valid = await bcrypt.compare(password, tenant.password_hash);
      if (!valid) {
        return json({ error: "Invalid email or password." }, 401);
      }

      const responseData: Record<string, string> = { status: tenant.status, slug: tenant.slug };
      if (tenant.status === "active") {
        const freshToken = await createJWT({ tenantSlug: tenant.slug }, jwtSecret);
        await supabase.from("tenants").update({ token: freshToken }).eq("email", email);
        responseData.token = freshToken;
      }

      return json({ data: responseData, error: null });
    }

    if (req.method === "POST") {
      const ip = getClientIp(req);
      const allowed = await checkRateLimit(supabase, ip, "register", 5, 60 * 60 * 1000);
      if (!allowed) {
        return json({ error: "Too many registration attempts. Please try again later." }, 429);
      }

      const { name, email, organization, site_name, password, plan_id, promo_code } = await req.json();

      if (!name || !email || !password || !site_name) {
        return json({ error: "Name, email, site name, and password are required" }, 400);
      }

      if (!plan_id) {
        return json({ error: "Please select a plan." }, 400);
      }

      const siteNameError = validateSiteName(site_name);
      if (siteNameError) {
        return json({ error: siteNameError }, 400);
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        return json({ error: passwordError }, 400);
      }

      const { data: existing } = await supabase.from("tenants").select("id").eq("email", email).maybeSingle();
      if (existing) {
        return json({ error: "An account with this email already exists" }, 409);
      }

      const { data: slugCheck } = await supabase.from("tenants").select("id").eq("slug", site_name).maybeSingle();
      if (slugCheck) {
        return json({ error: "This site name is already taken. Please choose another." }, 409);
      }

      const { data: siteNameCheck } = await supabase.from("tenants").select("id").eq("site_name", site_name).maybeSingle();
      if (siteNameCheck) {
        return json({ error: "This site name is already taken. Please choose another." }, 409);
      }

      const { data: plan } = await supabase.from("plans").select("id, plan_name, token").eq("id", plan_id).eq("show", 1).maybeSingle();
      if (!plan) {
        return json({ error: "Invalid plan selected." }, 400);
      }

      if (plan.token !== null) {
        if (!promo_code || promo_code.trim() === "") {
          return json({ error: "This plan requires an Invitation Code." }, 400);
        }

        const planNameLower = (plan.plan_name as string).toLowerCase();
        const tokenTable = planNameLower === "founder" ? "founder_tokens_used" : "promotional_tokens_used";

        const { data: tokenRow } = await supabase
          .from(tokenTable)
          .select("id, redeemed_by_tenant_id, token_value")
          .eq("code", promo_code.trim())
          .maybeSingle();

        if (!tokenRow) {
          return json({ error: "This Code is invalid." }, 400);
        }

        if (tokenRow.token_value !== null || tokenRow.redeemed_by_tenant_id !== null) {
          return json({ error: "This Code has already been redeemed." }, 409);
        }

        const password_hash = await bcrypt.hash(password, 10);
        const slug = site_name;
        const tenantToken = await createJWT({ tenantSlug: slug }, jwtSecret);

        const expiresAt = planNameLower === "promotional"
          ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const { data: newTenant, error: insertErr } = await supabase.from("tenants").insert({
          name, email, organization: organization || "", slug, site_name, status: "active",
          token: tenantToken, password_hash, approved_at: new Date().toISOString(),
          plan_type: plan.plan_name, expires_at: expiresAt,
        }).select("id").single();
        if (insertErr) return json({ error: insertErr.message }, 500);

        const { error: updateErr, count: updateCount } = await supabase.from(tokenTable).update({
          redeemed_by_tenant_id: newTenant.id,
          redeemed_at: new Date().toISOString(),
          token_value: plan.token,
        }).eq("id", tokenRow.id).select("id", { count: "exact", head: true });

        if (updateErr || updateCount === 0) {
          const internalError = updateErr
            ? `Token update error: ${updateErr.message}`
            : `Token update matched 0 rows for token id ${tokenRow.id}`;

          await supabase.from("tenants").delete().eq("id", newTenant.id);

          EdgeRuntime.waitUntil(sendWelcomeEmail(email, plan.plan_name as string));
          return json({
            error: null,
            data: { slug, token: tenantToken, status: "active" },
            tokenError: internalError,
          });
        }

        EdgeRuntime.waitUntil(sendWelcomeEmail(email, plan.plan_name as string));
        return json({ data: { slug, token: tenantToken, status: "active" }, error: null });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const slug = site_name;
      const token = await createJWT({ tenantSlug: slug }, jwtSecret);

      const isPaidPlan = ["Monthly", "Annual"].includes(plan.plan_name as string);
      const effectivePlanType = isPaidPlan ? "Free" : plan.plan_name;
      const pendingPlanType = isPaidPlan ? plan.plan_name : null;

      const { error: insertErr } = await supabase.from("tenants").insert({
        name, email, organization: organization || "", slug, site_name, status: "active",
        token, password_hash, approved_at: new Date().toISOString(),
        plan_type: effectivePlanType,
        pending_plan_type: pendingPlanType,
      });
      if (insertErr) return json({ error: insertErr.message }, 500);
      EdgeRuntime.waitUntil(sendWelcomeEmail(email, effectivePlanType as string));
      return json({ data: { slug, token, status: "active" }, error: null });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
