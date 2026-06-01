import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
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
    if (!turnstileToken) {
      return new Response(
        JSON.stringify({ error: "CAPTCHA verification required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!turnstileSecret) {
      console.error("TURNSTILE_SECRET_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Server CAPTCHA configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ip = req.headers.get("cf-connecting-ip");
    const formData = new FormData();
    formData.append("secret", turnstileSecret);
    formData.append("response", turnstileToken);
    if (ip) formData.append("remoteip", ip);

    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      body: formData,
      method: "POST",
    });

    const outcome = await result.json();
    if (!outcome.success) {
      console.error("Turnstile verification failed:", outcome);
      return new Response(
        JSON.stringify({
          success: false,
          error: "CAPTCHA verification failed",
          details: outcome['error-codes']
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        duplicateResults = matches.map((m) => ({
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
