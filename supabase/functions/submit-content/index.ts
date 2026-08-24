import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendTelegramNotification, sanitizeHTML } from "../_shared/notifier.ts";
import { checkRateLimit, verifyTurnstile, checkEndpointEnabled, sanitizePayload } from "../_shared/security.ts";
import { submitContentSchema } from "../_shared/validation.ts";
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

  const endpointStatus = await checkEndpointEnabled(supabase, 'submissions');
  if (!endpointStatus.enabled) {
    return new Response(
      JSON.stringify({ error: endpointStatus.reason }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const clientIp = req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

  if (await checkRateLimit(supabase, clientIp, 'submit_content', 3, 60 * 60 * 1000)) {
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

    const validation = submitContentSchema.safeParse(rawBody);
    if (!validation.success) {
        return new Response(
            JSON.stringify({ error: "Validation failed", details: validation.error.errors }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
    const body = validation.data;

    const { submissionType, submittedData, submitterEmail, turnstileToken, submitterName, submitterContact } = body;

    const turnstileResult = await verifyTurnstile(turnstileToken);
    if (!turnstileResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: turnstileResult.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Duplicate check by name against live tables
    const name = submittedData.name?.toLowerCase?.() || "";
    const repoUrl = submittedData.repo_url?.trim?.() || "";
    let duplicateResults: any[] = [];

    if (name) {
      let table = "apps";
      if (submissionType === "extension") table = "extensions";
      if (submissionType === "guide") table = "guides";

      let query = supabase
        .from(table)
        .select("id, name, slug");

      if (submissionType === "guide") {
        query = query.ilike("title", `%${name}%`);
      } else {
        query = query.ilike("name", `%${name}%`);
      }

      const { data: matches } = await query.limit(5);

      if (matches && matches.length > 0) {
        for (const m of matches) {
          duplicateResults.push({
            id: m.id,
            slug: m.slug || m.id,
            name: submissionType === 'guide' ? m.title : m.name,
            source: 'live',
          });
        }
      }
    }

    // Duplicate check by repo_url against live tables
    if (repoUrl && submissionType !== 'guide') {
      const tables = ['apps', 'extensions'];
      for (const t of tables) {
        const { data: repoMatches } = await supabase
          .from(t)
          .select("id, name, slug")
          .ilike("repo_url", repoUrl)
          .limit(3);

        if (repoMatches && repoMatches.length > 0) {
          for (const m of repoMatches) {
            if (!duplicateResults.some((d: any) => d.id === m.id)) {
              duplicateResults.push({
                id: m.id,
                slug: m.slug || m.id,
                name: m.name,
                source: 'live',
              });
            }
          }
        }
      }
    }

    // Duplicate check against existing submissions (pending/rejected)
    if (name || repoUrl) {
      const { data: subMatches } = await supabase
        .from('submissions')
        .select('id, status, admin_notes, submitted_data, submission_type')
        .eq('submission_type', submissionType)
        .in('status', ['pending', 'rejected'])
        .limit(20);

      if (subMatches && subMatches.length > 0) {
        for (const s of subMatches) {
          const subData = s.submitted_data as any;
          const subName = (subData?.name || '').toLowerCase();
          const subRepo = (subData?.repo_url || '').trim().toLowerCase();

          const nameMatch = name && subName === name;
          const repoMatch = repoUrl && subRepo && subRepo === repoUrl.toLowerCase();

          if (nameMatch || repoMatch) {
            duplicateResults.push({
              id: s.id,
              name: subData?.name || 'Unknown',
              source: 'submission',
              status: s.status,
              reason: s.status === 'rejected' ? (s.admin_notes || null) : null,
            });
          }
        }
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
      duplicate_check_results: duplicateResults.length > 0 ? duplicateResults : null,
      status: "pending",
    }).select("id").single();

    if (error) {
      console.error("Submission insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to submit" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let typeLabel = "App";
    if (submissionType === "extension") typeLabel = "Extension";
    if (submissionType === "guide") typeLabel = "Guide";
    
    const nameStr = sanitizeHTML(submissionType === 'guide' ? submittedData.title : (submittedData.name || "Unknown"));
    const authorStr = sanitizeHTML(submittedData.author || "Unknown");

    const telegramMessage = `
\ud83d\ude80 <b>New ${typeLabel} Submission - Miyomi</b>

<b>Name:</b> ${nameStr}
<b>Author:</b> ${authorStr}
<b>Submitter Name:</b> ${sanitizeHTML(submitterName || "Anonymous")}
<b>Contact:</b> ${sanitizeHTML(submitterContact || "N/A")}
<b>Notes for Admin:</b> ${sanitizeHTML(body.submitterNotes || "None")}
<b>Time:</b> ${new Date().toLocaleString()}${duplicateResults.length > 0 ? `\n\u26a0\ufe0f <b>Potential duplicates detected (${duplicateResults.length})</b>` : ''}

Please review this submission in the admin dashboard.
    `.trim();

    sendTelegramNotification(supabase, telegramMessage).catch(err => {
      console.error("Error sending submission telegram alert:", err);
    });

    return new Response(
      JSON.stringify({
        success: true,
        submissionId: data.id,
        duplicates: duplicateResults.length > 0 ? duplicateResults : null,
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
