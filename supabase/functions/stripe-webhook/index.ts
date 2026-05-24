import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";
import { corsHeaders, json } from "../_shared/cors.ts";

function planTypeFromPriceId(priceId: string): string | null {
  const monthly = Deno.env.get("STRIPE_PRICE_MONTHLY");
  const annual = Deno.env.get("STRIPE_PRICE_ANNUAL");
  if (priceId === monthly) return "Monthly";
  if (priceId === annual) return "Annual";
  return null;
}

async function buildDowngradeSnapshot(supabase: ReturnType<typeof createClient>, tenantId: string): Promise<Record<string, number>> {
  const { data: shooters } = await supabase
    .from("tenant_shooters")
    .select("id")
    .eq("tenant_id", tenantId);

  const snapshot: Record<string, number> = {};
  if (!shooters || shooters.length === 0) return snapshot;

  for (const shooter of shooters) {
    const { count } = await supabase
      .from("tenant_range_records")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("shooter_id", shooter.id);
    snapshot[shooter.id] = count ?? 0;
  }
  return snapshot;
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

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

async function sendUpgradeEmail(email: string, newPlan: string): Promise<void> {
  const today = formatDate(new Date().toISOString());

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.6; max-width: 600px; margin: 0; padding: 20px;">
  <p style="margin: 0 0 16px 0;"><strong>Range Tracker&#8482; — Plan Upgraded</strong></p>
  <p style="margin: 0 0 16px 0;">Thank you for upgrading to Range Tracker&#8482;! We are thrilled to have you as a paying member and hope you enjoy all the benefits of the <strong>${newPlan}</strong> plan.</p>
  <p style="margin: 0 0 16px 0;">
    <strong>New Plan:</strong> ${newPlan}<br>
    <strong>Change Date:</strong> ${today}<br>
    <strong>Effective:</strong> Immediately
  </p>
  <p style="margin: 0 0 16px 0;">Log in at <a href="https://rangetrackerapp.com" style="color: #1155CC;">rangetrackerapp.com</a> to enjoy your new plan features.</p>
  <p style="margin: 0;">
    Range Tracker Account Services<br>
    <a href="https://rangetrackerapp.com" style="color: #1155CC;">https://rangetrackerapp.com</a>
  </p>
</body>
</html>`;

  const plain = `Range Tracker(tm) — Plan Upgraded

Thank you for upgrading to Range Tracker(tm)! We are thrilled to have you as a paying member and hope you enjoy all the benefits of the ${newPlan} plan.

New Plan: ${newPlan}
Change Date: ${today}
Effective: Immediately

Log in at rangetrackerapp.com to enjoy your new plan features.

Range Tracker Account Services
https://rangetrackerapp.com`;

  await sendSmtp(email, "Your Range Tracker Plan Has Been Upgraded", html, plain);
}

async function sendSwitchEmail(email: string, oldPlan: string, newPlan: string, effectiveDate: string): Promise<void> {
  const changeDate = formatDate(new Date().toISOString());
  const effectiveDateFormatted = formatDate(effectiveDate);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.6; max-width: 600px; margin: 0; padding: 20px;">
  <p style="margin: 0 0 16px 0;"><strong>Range Tracker&#8482; — Plan Updated</strong></p>
  <p style="margin: 0 0 16px 0;">Thank you for your continued use of Range Tracker&#8482;! Your billing plan has been updated as requested.</p>
  <p style="margin: 0 0 16px 0;">
    <strong>Previous Plan:</strong> ${oldPlan}<br>
    <strong>New Plan:</strong> ${newPlan}<br>
    <strong>Change Date:</strong> ${changeDate}<br>
    <strong>Effective Date:</strong> ${effectiveDateFormatted}
  </p>
  <p style="margin: 0 0 16px 0;">Your current plan remains active until the effective date. No action is needed on your part.</p>
  <p style="margin: 0;">
    Range Tracker Account Services<br>
    <a href="https://rangetrackerapp.com" style="color: #1155CC;">https://rangetrackerapp.com</a>
  </p>
</body>
</html>`;

  const plain = `Range Tracker(tm) — Plan Updated

Thank you for your continued use of Range Tracker(tm)! Your billing plan has been updated as requested.

Previous Plan: ${oldPlan}
New Plan: ${newPlan}
Change Date: ${changeDate}
Effective Date: ${effectiveDateFormatted}

Your current plan remains active until the effective date. No action is needed on your part.

Range Tracker Account Services
https://rangetrackerapp.com`;

  await sendSmtp(email, "Your Range Tracker Plan Has Been Updated", html, plain);
}

async function sendDowngradeEmail(email: string, oldPlan: string, effectiveDate: string): Promise<void> {
  const changeDate = formatDate(new Date().toISOString());
  const effectiveDateFormatted = formatDate(effectiveDate);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.6; max-width: 600px; margin: 0; padding: 20px;">
  <p style="margin: 0 0 16px 0;"><strong>Range Tracker&#8482; — Plan Change Confirmation</strong></p>
  <p style="margin: 0 0 16px 0;">We have received your request to change your Range Tracker&#8482; plan. Here is a summary of the change:</p>
  <p style="margin: 0 0 16px 0;">
    <strong>Previous Plan:</strong> ${oldPlan}<br>
    <strong>New Plan:</strong> Free<br>
    <strong>Change Date:</strong> ${changeDate}<br>
    <strong>Effective Date:</strong> ${effectiveDateFormatted}
  </p>
  <p style="margin: 0 0 16px 0;">You will continue to have full access to your ${oldPlan} plan features until <strong>${effectiveDateFormatted}</strong>.</p>
  <p style="margin: 0 0 16px 0;">We are sorry to see you step down from your paid plan. Is there anything we could do to bring you back? We value your feedback and would love to hear from you.</p>
  <p style="margin: 0 0 16px 0;">
    <a href="mailto:comments@rangetracker.net?subject=Downgrade%20Comments" style="display: inline-block; background-color: #1a73e8; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: bold;">Share Your Feedback</a>
  </p>
  <p style="margin: 0;">
    Range Tracker Account Services<br>
    <a href="https://rangetrackerapp.com" style="color: #1155CC;">https://rangetrackerapp.com</a>
  </p>
</body>
</html>`;

  const plain = `Range Tracker(tm) — Plan Change Confirmation

We have received your request to change your Range Tracker(tm) plan. Here is a summary of the change:

Previous Plan: ${oldPlan}
New Plan: Free
Change Date: ${changeDate}
Effective Date: ${effectiveDateFormatted}

You will continue to have full access to your ${oldPlan} plan features until ${effectiveDateFormatted}.

We are sorry to see you step down from your paid plan. Is there anything we could do to bring you back? We value your feedback and would love to hear from you.

Send us your feedback: mailto:comments@rangetracker.net?subject=Downgrade%20Comments

Range Tracker Account Services
https://rangetrackerapp.com`;

  await sendSmtp(email, "Your Range Tracker Plan Has Been Changed", html, plain);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecret || !webhookSecret) {
      return json({ error: "Stripe not configured" }, 500);
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return json({ error: "Missing stripe-signature header" }, 400);
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      return json({ error: `Webhook signature verification failed: ${String(err)}` }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantSlug = session.metadata?.tenant_slug;
      if (!tenantSlug) return json({ received: true });

      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, plan_type, email")
        .eq("slug", tenantSlug)
        .maybeSingle();
      if (!tenant) return json({ received: true });

      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price?.id;
      const planType = planTypeFromPriceId(priceId) ?? "Monthly";
      const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

      const oldPlanType = tenant.plan_type;

      await supabase.from("tenants").update({
        plan_type: planType,
        pending_plan_type: null,
        payment_attempt_started_at: null,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_subscription_status: subscription.status,
        current_period_end: periodEnd,
        downgrade_record_snapshot: null,
        expires_at: null,
      }).eq("id", tenant.id);

      if (tenant.email && oldPlanType === "Free") {
        EdgeRuntime.waitUntil(sendUpgradeEmail(tenant.email, planType));
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (!tenant) return json({ received: true });

      const subscriptionId = invoice.subscription as string;
      if (!subscriptionId) return json({ received: true });

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price?.id;
      const planType = planTypeFromPriceId(priceId);
      const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

      const updateData: Record<string, unknown> = {
        stripe_subscription_status: subscription.status,
        current_period_end: periodEnd,
      };
      if (planType) updateData.plan_type = planType;

      await supabase.from("tenants").update(updateData).eq("id", tenant.id);
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, plan_type, email")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (!tenant) return json({ received: true });

      const priceId = subscription.items.data[0]?.price?.id;
      const planType = planTypeFromPriceId(priceId);
      const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

      const oldPlanType = tenant.plan_type;

      const updateData: Record<string, unknown> = {
        stripe_subscription_id: subscription.id,
        stripe_subscription_status: subscription.status,
        current_period_end: periodEnd,
      };
      if (planType) updateData.plan_type = planType;

      await supabase.from("tenants").update(updateData).eq("id", tenant.id);

      if (tenant.email && planType && oldPlanType && planType !== oldPlanType &&
          oldPlanType !== "Free" && planType !== "Free") {
        EdgeRuntime.waitUntil(sendSwitchEmail(tenant.email, oldPlanType, planType, periodEnd));
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, plan_type, email, current_period_end")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (!tenant) return json({ received: true });

      const snapshot = await buildDowngradeSnapshot(supabase, tenant.id);

      await supabase.from("tenants").update({
        plan_type: "Free",
        pending_plan_type: null,
        stripe_subscription_id: null,
        stripe_subscription_status: "canceled",
        current_period_end: null,
        downgrade_record_snapshot: snapshot,
      }).eq("id", tenant.id);

      if (tenant.email && tenant.plan_type !== "Free" && tenant.current_period_end) {
        EdgeRuntime.waitUntil(sendDowngradeEmail(tenant.email, tenant.plan_type, tenant.current_period_end));
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (!tenant) return json({ received: true });

      await supabase.from("tenants").update({
        stripe_subscription_status: "past_due",
      }).eq("id", tenant.id);
    }

    return json({ received: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
