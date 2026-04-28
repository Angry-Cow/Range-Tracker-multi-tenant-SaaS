import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { password } = await req.json();
    if (!password) {
      return json({ error: "password required" }, 400);
    }

    const hash = await bcrypt.hash(password, 10);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("admin_credentials")
      .update({ password_hash: hash })
      .eq("username", "admin");

    if (error) {
      return json({ error: error.message }, 500);
    }

    return json({ success: true, hash });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
