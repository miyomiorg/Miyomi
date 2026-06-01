import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

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
    type: string;
    message: string;
    page: string;
    timestamp: string;
}

Deno.serve(async (req) => {
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

        if (!body.message || !body.type) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const allowedTypes = ["submit", "update", "report", "suggest", "love", "other"];
        if (!allowedTypes.includes(body.type)) {
            return new Response(
                JSON.stringify({ error: "Invalid feedback type" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (body.message.length > 2000) {
            return new Response(
                JSON.stringify({ error: "Message too long (max 2000 characters)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { data: botTokenSetting } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "telegram_bot_token")
            .single();

        const { data: chatIdsSetting } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "telegram_chat_ids")
            .single();

        let botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
        let chatIds: string[] = [];

        if (botTokenSetting?.value && typeof botTokenSetting.value === "string" && botTokenSetting.value.trim() !== "") {
            botToken = botTokenSetting.value;
        }

        if (chatIdsSetting?.value && Array.isArray(chatIdsSetting.value) && chatIdsSetting.value.length > 0) {
            chatIds = chatIdsSetting.value;
        } else {
            const envChatId = Deno.env.get("TELEGRAM_CHAT_ID");
            if (envChatId) {
                chatIds = [envChatId];
            }
        }

        if (!botToken || chatIds.length === 0) {
            console.error("Telegram not configured: token or chat IDs missing");
            return new Response(
                JSON.stringify({ error: "Feedback service not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const emojiMap: Record<string, string> = {
            submit: "➕",
            update: "❗",
            report: "❌",
            suggest: "💡",
            love: "❤️",
            other: "💬",
        };

        const emoji = emojiMap[body.type] || "💬";
        const typeLabel = body.type.charAt(0).toUpperCase() + body.type.slice(1);

        const sanitize = (str: string) => str.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));

        const telegramMessage = `
${emoji} <b>New Feedback - Miyomi</b>

<b>Type:</b> ${sanitize(typeLabel)}
<b>Page:</b> ${sanitize(body.page || "unknown")}
<b>Time:</b> ${new Date(body.timestamp).toLocaleString()}

<b>Message:</b>
${sanitize(body.message)}
    `.trim();

        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

        const sendPromises = chatIds.map((chatId: string) =>
            fetch(telegramUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: telegramMessage,
                    parse_mode: "HTML",
                }),
            })
        );

        const results = await Promise.allSettled(sendPromises);

        const allFailed = results.every((r) => r.status === "rejected");
        if (allFailed) {
            console.error("All Telegram sends failed");
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
