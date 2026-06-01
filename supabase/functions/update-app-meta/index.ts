import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response("Method not allowed", {
            status: 405,
            headers: corsHeaders,
        });
    }

    // Authenticate via X-API-KEY header
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("CRON_API_KEY");

    if (!expectedKey || apiKey !== expectedKey) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    try {
        const body = await req.json();
        const { updates } = body;

        if (!updates || !Array.isArray(updates)) {
            return new Response(
                JSON.stringify({ error: "Missing updates array" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        let updated = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const entry of updates) {
            const { slug, download_count, last_release_date } = entry;

            if (!slug) {
                skipped++;
                continue;
            }

            const updatePayload: Record<string, any> = {};
            if (typeof download_count === "number") {
                updatePayload.download_count = download_count;
            }
            if (last_release_date) {
                updatePayload.last_release_date = last_release_date;
            }

            if (Object.keys(updatePayload).length === 0) {
                skipped++;
                continue;
            }

            const { error } = await supabase
                .from("apps")
                .update(updatePayload)
                .eq("slug", slug);

            if (error) {
                console.error(`Update error for ${slug}:`, error.message);
                errors.push(`${slug}: update failed`);
            } else {
                updated++;
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                updated,
                skipped,
                total: updates.length,
                errors: errors.length > 0 ? errors : undefined,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Update app meta error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
