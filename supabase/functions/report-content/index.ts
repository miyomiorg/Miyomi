import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendTelegramNotification, sanitizeHTML } from "../_shared/notifier.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { 
      targetType, 
      targetId, 
      targetName,
      pageUrl, 
      reason, 
      message, 
      reporterName, 
      reporterContact, 
      reporterUserId, 
      turnstileToken,
      anonymousId,
      device_fingerprint,
      ip_address,
      browser,
      os,
      device_type,
      screen_resolution,
      timezone,
      language
    } = body;

    if (!reason || !message || !targetType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const disableTurnstile = Deno.env.get("DISABLE_TURNSTILE") === "true";
    if (!disableTurnstile) {
      if (!turnstileToken) {
        return new Response(
          JSON.stringify({ error: "CAPTCHA verification required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
      if (!turnstileSecret) {
        return new Response(
          JSON.stringify({ error: "Server CAPTCHA configuration error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const formData = new FormData();
      formData.append("secret", turnstileSecret);
      formData.append("response", turnstileToken);

      const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        body: formData,
        method: "POST",
      });

      const outcome = await result.json();
      if (!outcome.success) {
        return new Response(
          JSON.stringify({ success: false, error: "CAPTCHA verification failed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data, error } = await supabase.from("reports").insert({
      target_type: targetType,
      target_id: targetId || null,
      page_url: pageUrl || null,
      reason: reason,
      message: message,
      reporter_name: reporterName || null,
      reporter_contact: reporterContact || null,
      reporter_user_id: reporterUserId || null,
      status: "new",
      anonymous_id: anonymousId || null,
      device_fingerprint: device_fingerprint || null,
      ip_address: ip_address || null,
      browser: browser || null,
      os: os || null,
      device_type: device_type || null,
      screen_resolution: screen_resolution || null,
      timezone: timezone || null,
      language: language || null,
    }).select("id").single();

    if (error) {
      console.error("Report insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to submit report: " + error.message, details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetNameStr = targetName ? ` - ${sanitizeHTML(targetName)}` : '';
    const telegramMessage = `
🚩 <b>New Report - Miyomi</b>

<b>Reason:</b> ${sanitizeHTML(reason)}
<b>Target:</b> ${targetType}${targetNameStr} ${targetId ? `(ID: ${targetId})` : ''}
<b>Reporter:</b> ${sanitizeHTML(reporterName || "Anonymous")}
<b>Time:</b> ${new Date().toLocaleString()}

<b>Message:</b>
${sanitizeHTML(message)}

Please review this report in the admin dashboard.
    `.trim();

    sendTelegramNotification(supabase, telegramMessage).catch(err => {
      console.error("Error sending report telegram alert:", err);
    });

    return new Response(
      JSON.stringify({ success: true, reportId: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Report error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
