import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendTelegramNotification, sanitizeHTML } from "../_shared/notifier.ts";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // max 10 feedback per IP per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return false;
    }

    if (entry.count >= RATE_LIMIT_MAX) {
        return true;
    }

    entry.count++;
    return false;
}

interface FeedbackRequest {
    message: string;
    page: string;
    timestamp: string;
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
        const clientIp = req.headers.get("cf-connecting-ip") ||
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "unknown";

        if (isRateLimited(clientIp)) {
            return new Response(
                JSON.stringify({ error: "Too many requests. Please try again later." }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const body: FeedbackRequest = await req.json();

        if (!body.message) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (body.message.length > 2000) {
            return new Response(
                JSON.stringify({ error: "Message too long (max 2000 characters)" }),
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
