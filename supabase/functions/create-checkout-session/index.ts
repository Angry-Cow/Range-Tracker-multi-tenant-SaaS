import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";
import { corsHeaders, json } from "../_shared/cors.ts";

async function verifyTenantToken(token: string, secret: string): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = Uint8Array.from(atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(`${parts[0]}.${parts[1]}`));
    if (!valid) return null;
    return payload.tenantSlug || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) return json({ error: "Stripe not configured" }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const jwtSecret = Deno.env.get("JWT_SECRET") || "range-tracker-secret-change-in-production";
    const tenantSlug = await verifyTenantToken(token, jwtSecret);
    if (!tenantSlug) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, email, stripe_customer_id, plan_type")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (!tenant) return json({ error: "Tenant not found" }, 404);

    const { plan_type: requestedPlan } = await req.json();
    if (!["Monthly", "Annual"].includes(requestedPlan)) {
      return json({ error: "Invalid plan. Must be Monthly or Annual." }, 400);
    }

    await supabase.from("tenants").update({
      pending_plan_type: requestedPlan,
      payment_attempt_started_at: new Date().toISOString(),
    }).eq("id", tenant.id);

    const priceIdMonthly = Deno.env.get("STRIPE_PRICE_MONTHLY");
    const priceIdAnnual = Deno.env.get("STRIPE_PRICE_ANNUAL");
    if (!priceIdMonthly || !priceIdAnnual) {
      return json({ error: "Stripe price IDs not configured" }, 500);
    }

    const priceId = requestedPlan === "Monthly" ? priceIdMonthly : priceIdAnnual;

    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });

    let customerId = tenant.stripe_customer_id as string | null;
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: tenant.email,
          metadata: { tenant_slug: tenantSlug },
        });
        customerId = customer.id;
        await supabase.from("tenants").update({ stripe_customer_id: customerId }).eq("id", tenant.id);
      } catch (err) {
        console.error("[create-checkout-session] stripe.customers.create failed:", err);
        return json({ error: "Failed to set up payment account. Please try again.", data: null }, 500);
      }
    }

    const appUrl = Deno.env.get("APP_URL") || "https://range-tracker.app";

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${appUrl}/?payment_success=1&session_id={CHECKOUT_SESSION_ID}&plan=${requestedPlan}`,
        cancel_url: `${appUrl}/?payment_cancelled=1`,
        metadata: { tenant_slug: tenantSlug },
      });
      return json({ data: { url: session.url }, error: null });
    } catch (err) {
      console.error("[create-checkout-session] stripe.checkout.sessions.create failed:", err);
      return json({ error: "Failed to create checkout session. Please try again.", data: null }, 500);
    }
  } catch (err) {
    console.error("[create-checkout-session] unexpected error:", err);
    return json({ error: "An unexpected error occurred. Please try again.", data: null }, 500);
  }
});
