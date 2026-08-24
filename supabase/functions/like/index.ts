import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/security.ts";

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

      // Exact fingerprint validation (Supports MD5 32-char or SHA-256 64-char)
      const fingerprintRegex = /^[a-f0-9]{32,128}$/i;
      if (!fingerprintRegex.test(postFingerprint)) {
        return new Response(
          JSON.stringify({ error: "Invalid fingerprint format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Strict origin/referrer check for simple bot defense
      const referer = req.headers.get("referer") || req.headers.get("origin") || "";
      const allowedOrigins = ["test2.miyomi.pages.dev", "miyomi.app", "localhost:"];
      if (!allowedOrigins.some(origin => referer.includes(origin))) {
         // Silently fail for bots sending no referer or bad origin to waste their time
         return new Response(
           JSON.stringify({ error: "Invalid request origin" }),
           { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
      }

      // Hashed IP Rate limiting (15 likes per hour per IP)
      const clientIp = req.headers.get("cf-connecting-ip") ||
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";

      const userAgent = req.headers.get("user-agent") || "";
      const secChUa = req.headers.get("sec-ch-ua") || "";
      const secChUaPlatform = req.headers.get("sec-ch-ua-platform") || "";
      const acceptLanguage = req.headers.get("accept-language") || "";
      const country = req.headers.get("cf-ipcountry") || "";
      
      const uaLower = userAgent.toLowerCase();
      let isBot = false;
      let botReason = "";

      // 1. Header-based Heuristics
      if (!userAgent || uaLower.includes('python-requests') || uaLower.includes('curl') || uaLower.includes('headlesschrome') || uaLower.includes('puppeteer') || uaLower.includes('phantomjs') || uaLower.includes('playwright')) {
        isBot = true;
        botReason = "Suspicious User-Agent";
      } else if (secChUa.toLowerCase().includes('test') || secChUaPlatform.toLowerCase().includes('test') || uaLower.includes('testbrowser') || uaLower.includes('testos')) {
        isBot = true;
        botReason = "Test payload detected in headers";
      }

      // 2. Tighter IP Rate limit (15/hr)
      if (!isBot && await checkRateLimit(supabase, clientIp, 'like_action', 15, 60 * 60 * 1000)) {
        isBot = true;
        botReason = "IP Rate limit exceeded (15/hr)";
      }

      // 3. Tighter Fingerprint Rate limit (10/hr)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: recentLikes } = await supabase
        .from("likes")
        .select("id", { count: "exact", head: true })
        .eq("device_fingerprint", postFingerprint)
        .gte("liked_at", oneHourAgo);

      if (!isBot && (recentLikes || 0) >= 10) {
        isBot = true;
        botReason = "Fingerprint Rate limit exceeded (10/hr)";
      }

      // Read current likes_count BEFORE toggling
      const currentCount = await getItemLikesCount(supabase, postItemId, postItemType);

      // --- HONEYPOT SHADOWBAN LOGIC ---
      if (isBot) {
        // Log the bot attack silently
        await supabase.from("bot_attack_logs").insert({
          ip_address: clientIp,
          country: country,
          user_agent: userAgent,
          headers_dump: { secChUa, secChUaPlatform, acceptLanguage, referer },
          reason: botReason
        });
        
        // Return HTTP 200 OK with fake success payload to fool the bot
        return new Response(
          JSON.stringify({ loved: true, count: currentCount + 1 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // --------------------------------

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
        await supabase.from("likes").insert({
          item_id: postItemId,
          item_type: postItemType,
          device_fingerprint: postFingerprint,
          fingerprint_method: "canvas+hardware",
          user_agent: userAgent,
          language: acceptLanguage,
          referrer: referer,
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
