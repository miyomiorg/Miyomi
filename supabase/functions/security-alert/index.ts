import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

interface SecurityAlertRequest {
    email: string;
    auth_provider: string;
    ip_address?: string;
    browser?: string;
    browser_version?: string;
    os?: string;
    os_version?: string;
    device_type?: string;
    device_fingerprint?: string;
    country?: string;
    city?: string;
    user_agent?: string;
    timestamp: string;
}

Deno.serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);

    // Handle CORS preflight
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

        const body: SecurityAlertRequest = await req.json();

        if (!body.email && !body.auth_provider) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        await supabase.from("unauthorized_login_attempts").insert({
            email: body.email || "unknown",
            auth_provider: body.auth_provider || "unknown",
            ip_address: body.ip_address || null,
            user_agent: body.user_agent || null,
            browser: body.browser || null,
            browser_version: body.browser_version || null,
            os: body.os || null,
            os_version: body.os_version || null,
            device_type: body.device_type || "desktop",
            device_fingerprint: body.device_fingerprint || null,
            country: body.country || null,
            city: body.city || null,
        });

        // Fetch Telegram settings from database
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

        // If Telegram not configured, still return success (we logged to DB at least)
        if (!botToken || chatIds.length === 0) {
            console.warn("Telegram not configured — alert logged to DB only");
            return new Response(
                JSON.stringify({ success: true, telegram: false }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const sanitize = (str: string) => str.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));

        const locationParts = [body.city, body.country].filter(Boolean);
        const locationStr = locationParts.length > 0 ? locationParts.join(", ") : "Unknown";
        const browserStr = body.browser ? `${body.browser}${body.browser_version ? ` ${body.browser_version}` : ''}` : 'Unknown';
        const osStr = body.os ? `${body.os}${body.os_version ? ` ${body.os_version}` : ''}` : 'Unknown';

        const telegramMessage = `
🚨 <b>SUSPICIOUS LOGIN DETECTED — Miyomi</b>

<b>Email:</b> ${sanitize(body.email || "Unknown")}
<b>Provider:</b> ${sanitize(body.auth_provider || "Unknown")}
<b>IP:</b> ${sanitize(body.ip_address || "Unknown")}
<b>Location:</b> ${sanitize(locationStr)}
<b>Browser:</b> ${sanitize(browserStr)} / ${sanitize(osStr)}
<b>Device:</b> ${sanitize(body.device_type || "desktop")}
<b>Fingerprint:</b> <code>${sanitize(body.device_fingerprint || "N/A")}</code>
<b>Time:</b> ${new Date(body.timestamp).toLocaleString()}

⚠️ <i>Unauthorized user attempted admin access. Session destroyed.</i>
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

        await Promise.allSettled(sendPromises);

        return new Response(
            JSON.stringify({ success: true, telegram: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Security alert error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
