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
    const { submissionType, submittedData, submitterEmail, turnstileToken, submitterName, submitterContact } = body;

    if (!submissionType || !submittedData) {
      return new Response(
        JSON.stringify({ error: "Missing submissionType or submittedData" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate Turnstile Token — ALWAYS required
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

    // Validate submission type
    if (!["app", "extension"].includes(submissionType)) {
      return new Response(
        JSON.stringify({ error: "Invalid submission type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic duplicate check by name
    const name = submittedData.name?.toLowerCase?.() || "";
    let duplicateResults = null;

    if (name) {
      const table = submissionType === "app" ? "apps" : "extensions";
      const { data: matches } = await supabase
        .from(table)
        .select("id, name, slug")
        .ilike("name", `%${name}%`)
        .limit(5);

      if (matches && matches.length > 0) {
        duplicateResults = matches.map((m: any) => ({
          id: m.slug || m.id,
          name: m.name,
        }));
      }
    }

    // Insert submission
    const { data, error } = await supabase.from("submissions").insert({
      submission_type: submissionType,
      submitted_data: {
        ...submittedData,
        author: submittedData.author || null,
        submitter_notes: body.submitterNotes || null,
      },
      submitter_email: submitterEmail || null,
      submitter_name: submitterName || null,
      submitter_contact: submitterContact || null,
      author: submittedData.author || null,
      duplicate_check_results: duplicateResults,
      status: "pending",
    }).select("id").single();

    if (error) {
      console.error("Submission insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to submit" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typeLabel = submissionType === "app" ? "App" : "Extension";
    const nameStr = sanitizeHTML(submittedData.name || "Unknown");
    const authorStr = sanitizeHTML(submittedData.author || "Unknown");

    const telegramMessage = `
🚀 <b>New ${typeLabel} Submission - Miyomi</b>

<b>Name:</b> ${nameStr}
<b>Author:</b> ${authorStr}
<b>Submitter Name:</b> ${sanitizeHTML(submitterName || "Anonymous")}
<b>Contact:</b> ${sanitizeHTML(submitterContact || "N/A")}
<b>Notes for Admin:</b> ${sanitizeHTML(body.submitterNotes || "None")}
<b>Time:</b> ${new Date().toLocaleString()}

Please review this submission in the admin dashboard.
    `.trim();

    // Fire and forget the telegram notification so we don't delay the user
    sendTelegramNotification(supabase, telegramMessage).catch(err => {
      console.error("Error sending submission telegram alert:", err);
    });

    return new Response(
      JSON.stringify({
        success: true,
        submissionId: data.id,
        duplicates: duplicateResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Submit error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
