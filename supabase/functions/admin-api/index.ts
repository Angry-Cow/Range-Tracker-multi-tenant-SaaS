import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import { corsHeaders, json } from "../_shared/cors.ts";

type SupabaseClient = ReturnType<typeof createClient>;

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function createJWT(payload: Record<string, unknown>, secret: string, expiresInSeconds: number): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const body = btoa(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSeconds })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const sig = await hmacSign(`${header}.${body}`, secret);
  return `${header}.${body}.${sig}`;
}

async function verifyAdminToken(token: string, secret: string): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.role !== "admin") return null;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = Uint8Array.from(atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(`${parts[0]}.${parts[1]}`));
    return valid ? (payload.username ?? "admin") : null;
  } catch {
    return null;
  }
}

async function bcryptVerify(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function audit(
  supabase: SupabaseClient,
  action: string,
  adminUsername: string,
  targetTenantId?: string | null,
  details?: Record<string, unknown> | null
): Promise<void> {
  await supabase.from("admin_audit_log").insert({
    admin_username: adminUsername,
    action,
    target_tenant_id: targetTenantId ?? null,
    details: details ?? null,
  });
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

async function sendApprovalEmail(tenant: { email: string; slug: string; name: string; plan_type: string }): Promise<void> {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.6; max-width: 600px; margin: 0; padding: 20px;">
  <p style="margin: 0 0 16px 0;">
    <strong>Welcome to the Range Tracker App.</strong> brought to you by <strong>T.O.L.R.<sup>&trade;</sup> Tools <span style="text-decoration: underline;">Of</span> Last Resort.</strong> <a href="https://tolr.net" style="color: #1155CC;">https://tolr.net</a>
  </p>
  <p style="margin: 0 0 16px 0;">
    Thank you for your interest in our service.&nbsp; We know you will find it as useful for tracking your range activities as we do.<br>
    Your account is registered with the <strong>${tenant.plan_type}</strong> program.
  </p>
  <p style="margin: 0 0 16px 0;">
    Your private Tracker is available at <strong><a href="https://rangetrackerapp.com" style="color: #1155CC;">rangetrackerapp.com</a></strong><br>
    Log in with the email and password you signed up with.
  </p>
  <p style="margin: 0 0 16px 0;">
    Thank you for selecting <strong>Range Tracker</strong> as your tool of choice!
  </p>
  <p style="margin: 0;">
    Range Tracker Account Services<br>
    <a href="https://rangetrackerapp.com" style="color: #1155CC;">https://rangetrackerapp.com</a>
  </p>
</body>
</html>`;

  const plain = `Welcome to the Range Tracker App. brought to you by T.O.L.R.(tm) Tools Of Last Resort. https://tolr.net

Thank you for your interest in our service.  We know you will find it as useful for tracking your range activities as we do.
Your account is registered with the ${tenant.plan_type} program.

Your private Tracker is available at rangetrackerapp.com.
Log in with the email and password you signed up with.

Thank you for selecting Range Tracker as your tool of choice!

Range Tracker Account Services
https://rangetrackerapp.com`;

  await sendSmtp(tenant.email, "Your Range Tracker Application is Live", html, plain);
}

async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const appUrl = Deno.env.get("APP_URL") || "https://rangetrackerapp.com";
  const resetUrl = `${appUrl}/admin?reset_token=${token}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.6; max-width: 600px; margin: 0; padding: 20px;">
  <p style="margin: 0 0 16px 0;"><strong>Range Tracker Admin — Password Reset</strong></p>
  <p style="margin: 0 0 16px 0;">A password reset was requested for the admin account. Click the link below to set a new password. This link expires in 1 hour.</p>
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

  const plain = `Range Tracker Admin — Password Reset

A password reset was requested for the admin account. Visit the link below to set a new password. This link expires in 1 hour.

${resetUrl}

If you did not request this, you can safely ignore this email.

Range Tracker Account Services
https://rangetrackerapp.com`;

  await sendSmtp(email, "Range Tracker Admin — Password Reset", html, plain);
}

// Route handlers

async function handleForgotPassword(req: Request, supabase: SupabaseClient): Promise<Response> {
  const { email } = await req.json();
  if (email) {
    const { data: cred } = await supabase
      .from("admin_credentials")
      .select("username")
      .eq("username", "admin")
      .maybeSingle();

    if (cred) {
      const token = crypto.randomUUID() + crypto.randomUUID();
      await supabase.from("admin_password_reset_tokens").insert({ token });
      EdgeRuntime.waitUntil(sendPasswordResetEmail(email, token));
    }
  }
  return json({ data: "If that address is registered, a reset link has been sent.", error: null });
}

async function handleResetPassword(req: Request, supabase: SupabaseClient): Promise<Response> {
  const { token, newPassword } = await req.json();
  if (!token || !newPassword) return json({ error: "token and newPassword are required" }, 400);
  if (newPassword.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);

  const { data: record } = await supabase
    .from("admin_password_reset_tokens")
    .select("id, used, created_at")
    .eq("token", token)
    .maybeSingle();

  if (!record) return json({ error: "Invalid or expired reset link" }, 400);
  if (record.used) return json({ error: "This reset link has already been used" }, 400);

  const ageMs = Date.now() - new Date(record.created_at).getTime();
  if (ageMs > 60 * 60 * 1000) return json({ error: "This reset link has expired" }, 400);

  const newHash = await bcrypt.hash(newPassword, 10);
  const { error: updateErr } = await supabase
    .from("admin_credentials")
    .update({ password_hash: newHash })
    .eq("username", "admin");
  if (updateErr) return json({ error: updateErr.message }, 500);

  await supabase.from("admin_password_reset_tokens").update({ used: true }).eq("id", record.id);
  return json({ data: "Password updated successfully", error: null });
}

async function handleLogin(req: Request, supabase: SupabaseClient, jwtSecret: string): Promise<Response> {
  const { username, password } = await req.json();
  const { data: cred } = await supabase
    .from("admin_credentials")
    .select("password_hash")
    .eq("username", username)
    .maybeSingle();

  if (!cred) {
    await audit(supabase, "failed-login", username ?? "unknown");
    return json({ error: "Invalid credentials" }, 401);
  }

  const valid = await bcryptVerify(password, cred.password_hash);
  if (!valid) {
    await audit(supabase, "failed-login", username ?? "unknown");
    return json({ error: "Invalid credentials" }, 401);
  }

  const token = await createJWT({ role: "admin" }, jwtSecret, 8 * 3600);
  await audit(supabase, "login", username ?? "admin");
  return json({ token, error: null });
}

async function handleGetPlans(supabase: SupabaseClient): Promise<Response> {
  const { data, error } = await supabase.from("plans").select("*").order("plan_name", { ascending: true });
  if (error) return json({ data: null, error: error.message }, 500);
  return json({ data, error: null });
}

async function handleGetTenants(supabase: SupabaseClient): Promise<Response> {
  const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
  if (error) return json({ data: null, error: error.message }, 500);
  return json({ data, error: null });
}

async function handleGetTenant(tenantId: string, supabase: SupabaseClient): Promise<Response> {
  const { data, error } = await supabase.from("tenants").select("*").eq("id", tenantId).maybeSingle();
  if (error) return json({ data: null, error: error.message }, 500);
  return json({ data, error: null });
}

async function handleSetPlan(req: Request, tenantId: string, supabase: SupabaseClient, adminUsername: string): Promise<Response> {
  const { plan_type } = await req.json();
  if (!plan_type) return json({ error: "plan_type is required" }, 400);
  const { error } = await supabase.from("tenants").update({ plan_type }).eq("id", tenantId);
  if (error) return json({ data: null, error: error.message }, 500);
  await audit(supabase, "set-plan", adminUsername, tenantId, { plan_type });
  return json({ data: null, error: null });
}

async function handleApproveTenant(tenantId: string, supabase: SupabaseClient, jwtSecret: string, adminUsername: string): Promise<Response> {
  const { data: tenant } = await supabase.from("tenants").select("*").eq("id", tenantId).maybeSingle();
  if (!tenant) return json({ error: "Tenant not found" }, 404);

  const newToken = await createJWT({ tenantSlug: tenant.slug }, jwtSecret, 30 * 24 * 3600);
  const { error } = await supabase.from("tenants").update({ status: "active", token: newToken, approved_at: new Date().toISOString() }).eq("id", tenantId);
  if (error) return json({ data: null, error: error.message }, 500);

  await audit(supabase, "approve", adminUsername, tenantId);
  EdgeRuntime.waitUntil(sendApprovalEmail({
    email: tenant.email,
    slug: tenant.slug,
    name: tenant.name,
    plan_type: tenant.plan_type || "Standard",
  }));

  return json({ data: { token: newToken }, error: null });
}

async function handleResendEmail(tenantId: string, supabase: SupabaseClient, adminUsername: string): Promise<Response> {
  const { data: tenant } = await supabase.from("tenants").select("*").eq("id", tenantId).maybeSingle();
  if (!tenant) return json({ error: "Tenant not found" }, 404);
  if (tenant.status !== "active") return json({ error: "Tenant is not active" }, 400);

  await audit(supabase, "resend-email", adminUsername, tenantId);
  EdgeRuntime.waitUntil(sendApprovalEmail({
    email: tenant.email,
    slug: tenant.slug,
    name: tenant.name,
    plan_type: tenant.plan_type || "Standard",
  }));

  return json({ data: null, error: null });
}

async function handleSuspendTenant(tenantId: string, supabase: SupabaseClient, adminUsername: string): Promise<Response> {
  const { error } = await supabase.from("tenants").update({ status: "suspended" }).eq("id", tenantId);
  if (error) return json({ data: null, error: error.message }, 500);
  await audit(supabase, "suspend", adminUsername, tenantId);
  return json({ data: null, error: null });
}

async function handleRejectTenant(tenantId: string, supabase: SupabaseClient, adminUsername: string): Promise<Response> {
  const { error } = await supabase.from("tenants").update({ status: "rejected" }).eq("id", tenantId);
  if (error) return json({ data: null, error: error.message }, 500);
  await audit(supabase, "reject", adminUsername, tenantId);
  return json({ data: null, error: null });
}

async function handleDeleteTenant(tenantId: string, supabase: SupabaseClient, adminUsername: string): Promise<Response> {
  await supabase.from("tenant_setting_values").delete().eq("tenant_id", tenantId);
  await supabase.from("tenant_range_records").delete().eq("tenant_id", tenantId);
  await supabase.from("tenant_shooters").delete().eq("tenant_id", tenantId);
  const { error } = await supabase.from("tenants").delete().eq("id", tenantId);
  if (error) return json({ data: null, error: error.message }, 500);
  await audit(supabase, "delete", adminUsername, tenantId);
  return json({ data: null, error: null });
}

async function handleGetRegistrations(supabase: SupabaseClient): Promise<Response> {
  const { data, error } = await supabase.from("tenants").select("*").eq("status", "pending").order("created_at", { ascending: false });
  if (error) return json({ data: null, error: error.message }, 500);
  return json({ data, error: null });
}

async function handleChangePassword(req: Request, supabase: SupabaseClient, adminUsername: string): Promise<Response> {
  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) return json({ error: "currentPassword and newPassword are required" }, 400);
  if (newPassword.length < 8) return json({ error: "New password must be at least 8 characters" }, 400);

  const { data: cred } = await supabase
    .from("admin_credentials")
    .select("password_hash")
    .eq("username", "admin")
    .maybeSingle();

  if (!cred) return json({ error: "Admin credentials not found" }, 404);

  const valid = await bcryptVerify(currentPassword, cred.password_hash);
  if (!valid) return json({ error: "Current password is incorrect" }, 401);

  const newHash = await bcrypt.hash(newPassword, 10);
  const { error } = await supabase
    .from("admin_credentials")
    .update({ password_hash: newHash })
    .eq("username", "admin");

  if (error) return json({ data: null, error: error.message }, 500);
  await audit(supabase, "change-password", adminUsername);
  return json({ data: null, error: null });
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
    const fnIndex = pathParts.indexOf("admin-api");
    const route = pathParts[fnIndex + 1];
    const subRoute = pathParts[fnIndex + 2];
    const action = pathParts[fnIndex + 3];

    // Public routes (no auth required)
    if (route === "forgot-password" && req.method === "POST") {
      return await handleForgotPassword(req, supabase);
    }

    if (route === "reset-password" && req.method === "POST") {
      return await handleResetPassword(req, supabase);
    }

    if (route === "login" && req.method === "POST") {
      return await handleLogin(req, supabase, jwtSecret);
    }

    // Authenticated routes
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const adminUsername = await verifyAdminToken(token, jwtSecret);
    if (!adminUsername) return json({ error: "Unauthorized" }, 401);

    if (route === "plans" && !subRoute && req.method === "GET") {
      return await handleGetPlans(supabase);
    }

    if (route === "tenants" && !subRoute && req.method === "GET") {
      return await handleGetTenants(supabase);
    }

    if (route === "tenants" && subRoute) {
      const tenantId = subRoute;

      if (req.method === "GET" && !action) return await handleGetTenant(tenantId, supabase);
      if (req.method === "POST" && action === "set-plan") return await handleSetPlan(req, tenantId, supabase, adminUsername);
      if (req.method === "POST" && action === "approve") return await handleApproveTenant(tenantId, supabase, jwtSecret, adminUsername);
      if (req.method === "POST" && action === "resend-email") return await handleResendEmail(tenantId, supabase, adminUsername);
      if (req.method === "POST" && action === "suspend") return await handleSuspendTenant(tenantId, supabase, adminUsername);
      if (req.method === "POST" && action === "reject") return await handleRejectTenant(tenantId, supabase, adminUsername);
      if (req.method === "DELETE" && !action) return await handleDeleteTenant(tenantId, supabase, adminUsername);
    }

    if (route === "registrations" && req.method === "GET") {
      return await handleGetRegistrations(supabase);
    }

    if (route === "change-password" && req.method === "POST") {
      return await handleChangePassword(req, supabase, adminUsername);
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    return json({ data: null, error: String(err) }, 500);
  }
});
