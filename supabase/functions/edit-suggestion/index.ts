import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendTelegramNotification, sanitizeHTML } from "../_shared/notifier.ts";
import { checkRateLimit, verifyTurnstile, checkEndpointEnabled, sanitizePayload } from "../_shared/security.ts";
import { editSuggestionSchema } from "../_shared/validation.ts";
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

  const endpointStatus = await checkEndpointEnabled(supabase, 'edit_suggestions');
  if (!endpointStatus.enabled) {
    return new Response(
      JSON.stringify({ error: endpointStatus.reason }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const clientIp = req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

  if (await checkRateLimit(supabase, clientIp, 'edit_suggestion', 5, 60 * 60 * 1000)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    let rawBody;
    try {
        rawBody = await req.json();
        rawBody = sanitizePayload(rawBody);
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const validation = editSuggestionSchema.safeParse(rawBody);
    if (!validation.success) {
        return new Response(
            JSON.stringify({ error: "Validation failed", details: validation.error.errors }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
    const body = validation.data;

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

    // Duplicate submission check: is there a recent pending edit for this exact target?
    const { data: existingEdits } = await supabase
      .from("public_edit_suggestions")
      .select("id")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("status", "pending")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existingEdits && existingEdits.length > 0) {
      return new Response(
        JSON.stringify({ error: "An edit suggestion for this item is already pending review." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const turnstileResult = await verifyTurnstile(turnstileToken);
    if (!turnstileResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: turnstileResult.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    const targetNameStr = sanitizeHTML(submittedData.name || submittedData.title || originalDataSnapshot.name || originalDataSnapshot.title || "Unknown");
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
