import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function isUnlimitedPlan(planType: string): boolean {
  return ["Monthly", "Annual", "Founder", "Promotional"].includes(planType);
}

const SHOOTER_LIMIT_FREE = 2;
const RECORDS_LIMIT_FREE = 20;
const SETTINGS_LIMIT_FREE = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const jwtSecret = Deno.env.get("JWT_SECRET") || "range-tracker-secret-change-in-production";
    const tenantSlug = await verifyTenantToken(token, jwtSecret);

    if (!tenantSlug) {
      return json({ data: null, error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, email, status, plan_type, password_hash, expires_at, downgrade_record_snapshot, pending_plan_type, stripe_subscription_id, stripe_subscription_status, payment_attempt_started_at, current_period_end")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (!tenant || tenant.status !== "active") {
      return json({ data: null, error: "Tenant not found or inactive" }, 403);
    }

    const tenantId = tenant.id;
    const planType: string = tenant.plan_type || "Free";
    const unlimited = isUnlimitedPlan(planType);

    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const resource = parts[parts.indexOf("tenant-api") + 1] || parts[parts.length - 1];
    const resourceId = parts[parts.indexOf(resource) + 1];

    if (resource === "plan-info") {
      if (req.method === "GET") {
        const { count: shooterCount } = await supabase
          .from("tenant_shooters")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId);

        return json({
          data: {
            name: tenant.name ?? "",
            email: tenant.email ?? "",
            plan_type: planType,
            unlimited,
            shooter_limit: unlimited ? null : SHOOTER_LIMIT_FREE,
            records_limit: unlimited ? null : RECORDS_LIMIT_FREE,
            settings_limit: unlimited ? null : SETTINGS_LIMIT_FREE,
            shooter_count: shooterCount ?? 0,
            expires_at: tenant.expires_at ?? null,
            downgrade_record_snapshot: tenant.downgrade_record_snapshot ?? null,
            pending_plan_type: tenant.pending_plan_type ?? null,
            stripe_subscription_id: tenant.stripe_subscription_id ?? null,
            stripe_subscription_status: tenant.stripe_subscription_status ?? null,
            payment_attempt_started_at: tenant.payment_attempt_started_at ?? null,
            current_period_end: tenant.current_period_end ?? null,
          },
          error: null,
        });
      }
    }

    if (resource === "verify-password" && req.method === "POST") {
      const { password } = await req.json();
      if (!password) return json({ data: null, error: "Password is required" }, 400);
      if (!tenant.password_hash) return json({ data: null, error: "No password configured" }, 400);
      const valid = await bcrypt.compare(password, tenant.password_hash);
      if (!valid) return json({ data: null, error: "Incorrect password" }, 401);
      return json({ data: { verified: true }, error: null });
    }

    if (resource === "change-plan" && req.method === "POST") {
      const { new_plan_type } = await req.json();
      if (!new_plan_type) return json({ data: null, error: "new_plan_type is required" }, 400);

      if (new_plan_type !== "Free") {
        return json({ data: null, error: "Plan upgrades must be completed through the billing portal" }, 400);
      }

      // For paid plan holders downgrading to Free, cancel their Stripe subscription at period end
      if (unlimited) {
        const subscriptionId = tenant.stripe_subscription_id as string | null;

        if (!subscriptionId) {
          // Monthly/Annual tenant without a Stripe subscription ID — data issue, cannot cancel
          return json({
            data: null,
            error: "No Stripe subscription found for your account. Please contact support to cancel your subscription before downgrading.",
          }, 400);
        }

        const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeSecret) return json({ data: null, error: "Billing not configured" }, 500);

        const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });

        let periodEnd: string | null = null;
        try {
          const updated = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
          periodEnd = new Date(updated.current_period_end * 1000).toISOString();
        } catch (stripeErr) {
          return json({ data: null, error: `Failed to cancel subscription: ${String(stripeErr)}` }, 500);
        }

        // Only set pending flag — keep plan_type as-is so tenant retains full access until period end
        const updateData: Record<string, unknown> = {
          pending_plan_type: "Free",
        };
        if (periodEnd) updateData.current_period_end = periodEnd;

        const { error } = await supabase
          .from("tenants")
          .update(updateData)
          .eq("id", tenantId);

        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data: { scheduled: true, current_period_end: periodEnd }, error: null });
      }

      // Non-unlimited plans (Founder, Promotional, Free) — immediate switch with snapshot
      const updateData: Record<string, unknown> = {
        plan_type: new_plan_type,
        pending_plan_type: "Free",
      };

      const { data: shooters } = await supabase
        .from("tenant_shooters")
        .select("id")
        .eq("tenant_id", tenantId);

      if (shooters && shooters.length > 0) {
        const snapshot: Record<string, number> = {};
        for (const shooter of shooters) {
          const { count } = await supabase
            .from("tenant_range_records")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("shooter_id", shooter.id);
          snapshot[shooter.id] = count ?? 0;
        }
        updateData.downgrade_record_snapshot = snapshot;
      } else {
        updateData.downgrade_record_snapshot = {};
      }

      const { error } = await supabase
        .from("tenants")
        .update(updateData)
        .eq("id", tenantId);

      if (error) return json({ data: null, error: error.message }, 500);
      return json({ data: { plan_type: new_plan_type }, error: null });
    }

    if (resource === "shooters") {
      if (req.method === "GET") {
        if (resourceId) {
          const { data, error } = await supabase.from("tenant_shooters").select("*").eq("id", resourceId).eq("tenant_id", tenantId).maybeSingle();
          if (error) return json({ data: null, error: error.message }, 500);
          return json({ data, error: null });
        }
        const { data, error } = await supabase.from("tenant_shooters").select("*").eq("tenant_id", tenantId).order("last_name", { ascending: true });
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }
      if (req.method === "POST") {
        if (!unlimited) {
          const { count } = await supabase
            .from("tenant_shooters")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenantId);
          if ((count ?? 0) >= SHOOTER_LIMIT_FREE) {
            return json({ data: null, error: `Shooter limit reached. Free plan allows up to ${SHOOTER_LIMIT_FREE} shooters.` }, 403);
          }
        }
        const body = await req.json();
        const { data, error } = await supabase.from("tenant_shooters").insert({ ...body, tenant_id: tenantId }).select().maybeSingle();
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }
      if (req.method === "PUT" && resourceId) {
        const body = await req.json();
        const { data, error } = await supabase.from("tenant_shooters").update(body).eq("id", resourceId).eq("tenant_id", tenantId).select().maybeSingle();
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }
      if (req.method === "DELETE" && resourceId) {
        await supabase.from("tenant_setting_values").delete().eq("shooter_id", resourceId).eq("tenant_id", tenantId);
        await supabase.from("tenant_range_records").delete().eq("shooter_id", resourceId).eq("tenant_id", tenantId);
        const { error } = await supabase.from("tenant_shooters").delete().eq("id", resourceId).eq("tenant_id", tenantId);
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data: null, error: null });
      }
    }

    if (resource === "range_records") {
      if (req.method === "GET") {
        if (resourceId) {
          const { data, error } = await supabase.from("tenant_range_records").select("*").eq("id", resourceId).eq("tenant_id", tenantId).maybeSingle();
          if (error) return json({ data: null, error: error.message }, 500);
          return json({ data, error: null });
        }
        const shooterId = url.searchParams.get("shooter_id");
        const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("page_size") || "20", 10)));
        const offset = (page - 1) * pageSize;

        let countQuery = supabase.from("tenant_range_records").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId);
        let dataQuery = supabase.from("tenant_range_records").select("*").eq("tenant_id", tenantId).order("record_date", { ascending: false }).range(offset, offset + pageSize - 1);
        if (shooterId) {
          countQuery = countQuery.eq("shooter_id", shooterId);
          dataQuery = dataQuery.eq("shooter_id", shooterId);
        }

        const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([countQuery, dataQuery]);
        if (countError) return json({ data: null, error: countError.message }, 500);
        if (dataError) return json({ data: null, error: dataError.message }, 500);
        return json({ data, error: null, total: count ?? 0, page, page_size: pageSize });
      }
      if (req.method === "POST") {
        const body = await req.json();
        if (!unlimited && body.shooter_id) {
          const { count } = await supabase
            .from("tenant_range_records")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("shooter_id", body.shooter_id);

          const currentCount = count ?? 0;
          const snapshot = tenant.downgrade_record_snapshot as Record<string, number> | null;

          if (snapshot && snapshot[body.shooter_id] !== undefined) {
            const allowedTotal = snapshot[body.shooter_id] + RECORDS_LIMIT_FREE;
            if (currentCount >= allowedTotal) {
              return json({ data: null, error: `Record limit reached. You may create ${RECORDS_LIMIT_FREE} more range records than you had at the time of downgrade.` }, 403);
            }
          } else {
            if (currentCount >= RECORDS_LIMIT_FREE) {
              return json({ data: null, error: `Record limit reached. Free plan allows up to ${RECORDS_LIMIT_FREE} range records per shooter.` }, 403);
            }
          }
        }
        const { data, error } = await supabase.from("tenant_range_records").insert({ ...body, tenant_id: tenantId }).select().maybeSingle();
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }
      if (req.method === "PUT" && resourceId) {
        const body = await req.json();
        const { data, error } = await supabase.from("tenant_range_records").update(body).eq("id", resourceId).eq("tenant_id", tenantId).select().maybeSingle();
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }
    }

    if (resource === "setting_values") {
      if (req.method === "GET") {
        const shooterId = url.searchParams.get("shooter_id");
        let query = supabase.from("tenant_setting_values").select("*").eq("tenant_id", tenantId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });
        if (shooterId) query = query.eq("shooter_id", shooterId);
        const { data, error } = await query;
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }
      if (req.method === "POST") {
        const body = await req.json();
        if (!unlimited && body.shooter_id && body.category) {
          const { count } = await supabase
            .from("tenant_setting_values")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("shooter_id", body.shooter_id)
            .eq("category", body.category);
          if ((count ?? 0) >= SETTINGS_LIMIT_FREE) {
            return json({ data: null, error: `Settings limit reached. Free plan allows up to ${SETTINGS_LIMIT_FREE} entries per category per shooter.` }, 403);
          }
        }
        const { data, error } = await supabase.from("tenant_setting_values").insert({ ...body, tenant_id: tenantId }).select().maybeSingle();
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data, error: null });
      }
      if (req.method === "PATCH") {
        // Bulk sort_order update: body is [{ id, sort_order }, ...]
        const updates: { id: string; sort_order: number }[] = await req.json();
        for (const update of updates) {
          const { error } = await supabase.from("tenant_setting_values")
            .update({ sort_order: update.sort_order })
            .eq("id", update.id)
            .eq("tenant_id", tenantId);
          if (error) return json({ data: null, error: error.message }, 500);
        }
        return json({ data: null, error: null });
      }
      if (req.method === "DELETE" && resourceId) {
        const { error } = await supabase.from("tenant_setting_values").delete().eq("id", resourceId).eq("tenant_id", tenantId);
        if (error) return json({ data: null, error: error.message }, 500);
        return json({ data: null, error: null });
      }
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    return json({ data: null, error: String(err) }, 500);
  }
});
