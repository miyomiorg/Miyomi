import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendTelegramNotification, sanitizeHTML } from "../_shared/notifier.ts";
import { checkRateLimit, verifyTurnstile, checkEndpointEnabled, sanitizePayload } from "../_shared/security.ts";
import { feedbackSchema } from "../_shared/validation.ts";

interface FeedbackRequest {
    message: string;
    page: string;
    timestamp: string;
    turnstileToken?: string;
}

Deno.serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const endpointStatus = await checkEndpointEnabled(supabase, 'feedback');
        if (!endpointStatus.enabled) {
            return new Response(
                JSON.stringify({ error: endpointStatus.reason }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const clientIp = req.headers.get("cf-connecting-ip") ||
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "unknown";

        if (await checkRateLimit(supabase, clientIp, 'feedback', 5, 60 * 60 * 1000)) {
            return new Response(
                JSON.stringify({ error: "Too many requests. Please try again later." }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        let rawBody;
        try {
            rawBody = await req.json();
            rawBody = sanitizePayload(rawBody);
        } catch (e) {
            return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const validation = feedbackSchema.safeParse(rawBody);
        if (!validation.success) {
            return new Response(
                JSON.stringify({ error: "Validation failed", details: validation.error.errors }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }
        const body = validation.data;

        const turnstileResult = await verifyTurnstile(body.turnstileToken);
        if (!turnstileResult.success) {
            return new Response(
                JSON.stringify({ error: turnstileResult.error }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const telegramMessage = `
💬 <b>New Feedback - Miyomi</b>

<b>Page:</b> ${sanitizeHTML(body.page || "unknown")}
<b>Time:</b> ${new Date(body.timestamp).toLocaleString()}

<b>Message:</b>
${sanitizeHTML(body.message)}
    `.trim();

        // Also insert into database
        const { error: insertError } = await supabase.from("feedbacks").insert({
            message: body.message,
            page_url: body.page || null,
            status: 'new'
        });

        if (insertError) {
            console.error("Failed to insert feedback into database:", insertError);
            // We can continue to send telegram notification as fallback
        }

        const success = await sendTelegramNotification(supabase, telegramMessage);
        
        if (!success) {
            console.error("Failed to send telegram feedback notification.");
            return new Response(
                JSON.stringify({ error: "Failed to send feedback" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, message: "Feedback received" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Feedback error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
