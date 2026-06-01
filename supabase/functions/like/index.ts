import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

async function getItemLikesCount(
  supabase: any,
  itemId: string,
  itemType: string
): Promise<number> {
  const tableName = itemType === "extension" ? "extensions" : "apps";
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("likes_count")
      .eq("id", itemId)
      .maybeSingle();
    if (error) {
      console.error(`Error reading likes_count from ${tableName}:`, error.message);
      return 0;
    }
    return data?.likes_count || 0;
  } catch (err) {
    console.error(`Exception reading likes_count:`, err);
    return 0;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const fingerprint = url.searchParams.get("fingerprint");

  try {
    if (req.method === "GET") {
      // Read likes_count from apps & extensions tables (authoritative)
      const [appsRes, extsRes] = await Promise.all([
        supabase.from("apps").select("id, likes_count"),
        supabase.from("extensions").select("id, likes_count"),
      ]);

      const countMap: Record<string, number> = {};
      for (const app of appsRes.data || []) {
        countMap[app.id] = app.likes_count || 0;
      }
      for (const ext of extsRes.data || []) {
        countMap[ext.id] = ext.likes_count || 0;
      }

      // User's liked items
      let userLikes: string[] = [];
      if (fingerprint) {
        const { data: ul } = await supabase
          .from("likes")
          .select("item_id")
          .eq("device_fingerprint", fingerprint);
        userLikes = (ul || []).map((v: any) => v.item_id);
      }

      const response: Record<string, { count: number; loved: boolean }> = {};
      for (const [id, count] of Object.entries(countMap)) {
        response[id] = { count, loved: userLikes.includes(id) };
      }
      for (const id of userLikes) {
        if (!response[id]) {
          response[id] = { count: 0, loved: true };
        }
      }

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const postItemId = url.searchParams.get("itemId") || body.itemId;
      const postFingerprint = fingerprint || body.fingerprint;
      const postItemType = body.itemType || url.searchParams.get("itemType") || "app";

      if (!postItemId || !postFingerprint) {
        return new Response(
          JSON.stringify({ error: "Missing itemId or fingerprint" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (typeof postFingerprint !== "string" || postFingerprint.length < 8 || postFingerprint.length > 128) {
        return new Response(
          JSON.stringify({ error: "Invalid fingerprint format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate limiting
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: recentLikes } = await supabase
        .from("likes")
        .select("id", { count: "exact", head: true })
        .eq("device_fingerprint", postFingerprint)
        .gte("liked_at", oneHourAgo);

      if ((recentLikes || 0) >= 30) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Read current likes_count BEFORE toggling
      const currentCount = await getItemLikesCount(supabase, postItemId, postItemType);

      // Toggle like
      const { data: existing } = await supabase
        .from("likes")
        .select("id")
        .eq("item_id", postItemId)
        .eq("device_fingerprint", postFingerprint)
        .limit(1);

      let loved: boolean;
      let finalCount: number;

      if (existing && existing.length > 0) {
        // Remove like — on_vote_change trigger decrements likes_count by 1
        await supabase.from("likes").delete().eq("id", existing[0].id);
        loved = false;
        finalCount = Math.max(0, currentCount - 1);
      } else {
        // Add like — on_vote_change trigger increments likes_count by 1
        const deviceInfo = body.deviceInfo || {};
        await supabase.from("likes").insert({
          item_id: postItemId,
          item_type: postItemType,
          device_fingerprint: postFingerprint,
          fingerprint_method: body.fingerprintMethod || "canvas",
          user_agent_hash: body.userAgentHash || null,
          ip_hash: null,
          anonymous_id: deviceInfo.anonymous_id || null,
          browser: deviceInfo.browser || null,
          browser_version: deviceInfo.browser_version || null,
          os: deviceInfo.os || null,
          os_version: deviceInfo.os_version || null,
          device_type: deviceInfo.device_type || null,
          device_vendor: deviceInfo.device_vendor || null,
          device_model: deviceInfo.device_model || null,
          user_agent: deviceInfo.user_agent || null,
          screen_resolution: deviceInfo.screen_resolution || null,
          timezone: deviceInfo.timezone || null,
          language: deviceInfo.language || null,
          referrer: deviceInfo.referrer || null,
        });
        loved = true;
        finalCount = currentCount + 1;
      }

      return new Response(JSON.stringify({ loved, count: finalCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error("Like error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
