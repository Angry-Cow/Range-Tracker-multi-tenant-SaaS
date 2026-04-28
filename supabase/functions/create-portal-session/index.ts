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
      .select("id, stripe_customer_id")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (!tenant) return json({ error: "Tenant not found" }, 404);
    if (!tenant.stripe_customer_id) return json({ error: "No billing account found" }, 400);

    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });

    const appUrl = Deno.env.get("APP_URL") || "https://range-tracker.app";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${appUrl}/`,
    });

    return json({ data: { url: portalSession.url }, error: null });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
