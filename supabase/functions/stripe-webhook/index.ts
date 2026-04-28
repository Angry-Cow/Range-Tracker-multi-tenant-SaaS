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
        .select("id, plan_type")
        .eq("slug", tenantSlug)
        .maybeSingle();
      if (!tenant) return json({ received: true });

      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price?.id;
      const planType = planTypeFromPriceId(priceId) ?? "Monthly";
      const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

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
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (!tenant) return json({ received: true });

      const priceId = subscription.items.data[0]?.price?.id;
      const planType = planTypeFromPriceId(priceId);
      const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

      const updateData: Record<string, unknown> = {
        stripe_subscription_id: subscription.id,
        stripe_subscription_status: subscription.status,
        current_period_end: periodEnd,
      };
      if (planType) updateData.plan_type = planType;

      await supabase.from("tenants").update(updateData).eq("id", tenant.id);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, plan_type")
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
