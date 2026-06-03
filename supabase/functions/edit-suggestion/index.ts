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
      originalDataSnapshot, 
      submittedData, 
      submitterName, 
      submitterContact, 
      submitterNotes,
      submitterUserId, 
      turnstileToken 
    } = body;

    if (!targetType || !targetId || !submittedData || !originalDataSnapshot) {
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

    const { data, error } = await supabase.from("public_edit_suggestions").insert({
      target_type: targetType,
      target_id: targetId,
      original_data_snapshot: originalDataSnapshot,
      submitted_data: {
        ...submittedData,
        submitter_notes: body.submitterNotes || null,
      },
      submitter_name: submitterName || null,
      submitter_contact: submitterContact || null,
      submitter_user_id: submitterUserId || null,
      status: "pending",
    }).select("id").single();

    if (error) {
      console.error("Edit suggestion insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to submit edit suggestion: " + error.message, details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetNameStr = sanitizeHTML(submittedData.name || originalDataSnapshot.name || "Unknown");
    const telegramMessage = `
📝 <b>New Edit Suggestion - Miyomi</b>

<b>Target:</b> ${targetType} - ${targetNameStr} (ID: ${targetId})
<b>Submitter Name:</b> ${sanitizeHTML(submitterName || "Anonymous")}
<b>Contact:</b> ${sanitizeHTML(submitterContact || "N/A")}
<b>Notes for Admin:</b> ${sanitizeHTML(submitterNotes || "None")}
<b>Time:</b> ${new Date().toLocaleString()}

Please review this edit suggestion in the admin dashboard.
    `.trim();

    sendTelegramNotification(supabase, telegramMessage).catch(err => {
      console.error("Error sending edit suggestion telegram alert:", err);
    });

    return new Response(
      JSON.stringify({ success: true, suggestionId: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edit suggestion error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
