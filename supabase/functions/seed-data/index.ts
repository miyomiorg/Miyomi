import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // SECURITY: Authenticate via Authorization header (super_admin required)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify caller identity
  const supabaseAnon = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user: caller }, error: authError } = await supabaseAnon.auth.getUser();
  if (authError || !caller) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if caller is super_admin
  const { data: isSuperAdmin } = await supabaseAdmin.rpc("has_role", {
    _user_id: caller.id,
    _role: "super_admin",
  });

  if (!isSuperAdmin) {
    return new Response(
      JSON.stringify({ error: "Forbidden: super_admin required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { table, data } = body;

    const results: Record<string, string> = {};

    // Full seed mode
    if (!table) {
      const { apps, extensions, faqs, guideCategories } = body;

      if (apps && Array.isArray(apps)) {
        const r = await seedApps(supabase, apps);
        results.apps = r;
      }
      if (extensions && Array.isArray(extensions)) {
        const r = await seedExtensions(supabase, extensions);
        results.extensions = r;
      }
      if (faqs && Array.isArray(faqs)) {
        const r = await seedFaqs(supabase, faqs);
        results.faqs = r;
      }
      if (guideCategories && Array.isArray(guideCategories)) {
        const r = await seedGuides(supabase, guideCategories);
        results.guides = r;
      }

      await seedSettings(supabase);
      results.settings = "Default settings seeded";

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single table mode
    if (!data || !Array.isArray(data)) {
      return new Response(
        JSON.stringify({ error: "Missing data array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (table) {
      case "apps":
        results.apps = await seedApps(supabase, data);
        break;
      case "extensions":
        results.extensions = await seedExtensions(supabase, data);
        break;
      case "faqs":
        results.faqs = await seedFaqs(supabase, data);
        break;
      case "guides":
        results.guides = await seedGuides(supabase, data);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown table: ${table}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function seedApps(supabase: any, apps: any[]): Promise<string> {
  const rows = apps.map((a: any) => ({
    slug: a.id.toLowerCase(),
    name: a.name,
    description: a.description || null,
    icon_url: a.logoUrl || null,
    icon_color: a.accentColor || a.iconColor || null,
    category: a.contentTypes?.[0] || null,
    platforms: a.platforms || [],
    tags: a.keywords || [],
    repo_url: a.githubUrl || null,
    download_url: a.getApp || null,
    website_url: a.officialSite || null,
    author: a.author || null,
    status: a.status === "discontinued" || a.status === "abandoned" || a.status === "Discontinued" ? a.status.toLowerCase() : "approved",
    metadata: {
      contentTypes: a.contentTypes || [],
      accentColor: a.accentColor || a.iconColor,
      supportedExtensions: a.supportedExtensions || [],
      discordUrl: a.discordUrl,
      tutorials: a.tutorials || [],
      forkOf: a.forkOf,
      upstreamUrl: a.upstreamUrl,
      keywords: a.keywords || [],
    },
  }));

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error } = await supabase.from("apps").upsert(chunk, { onConflict: "slug" });
    if (error) return `Error at batch ${i}: ${error.message}`;
    inserted += chunk.length;
  }
  return `${inserted} apps seeded`;
}

async function seedExtensions(supabase: any, extensions: any[]): Promise<string> {
  const rows = extensions.map((e: any) => ({
    slug: e.id.toLowerCase(),
    name: e.name,
    description: e.info || null,
    icon_url: e.logoUrl || null,
    icon_color: e.accentColor || null,
    category: e.types?.[0] || null,
    platforms: [],
    tags: e.keywords || [],
    source_url: e.website || null,
    repo_url: e.github || null,
    author: null,
    compatible_with: e.supportedApps || [],
    language: e.region || null,
    status: "approved",
    metadata: {
      types: e.types || [],
      region: e.region || "ALL",
      accentColor: e.accentColor,
      autoUrl: e.autoUrl || "",
      manualUrl: e.manualUrl || "",
      keywords: e.keywords || [],
      tutorials: e.tutorials || [],
      overview: e.overview,
      downloadCount: e.downloadCount,
    },
  }));

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error } = await supabase.from("extensions").upsert(chunk, { onConflict: "slug" });
    if (error) return `Error at batch ${i}: ${error.message}`;
    inserted += chunk.length;
  }
  return `${inserted} extensions seeded`;
}

async function seedFaqs(supabase: any, faqs: any[]): Promise<string> {
  const rows = faqs.map((f: any, i: number) => ({
    question: f.question,
    answer: f.answer,
    category: f.category || "general",
    order_index: i,
  }));

  const { error } = await supabase.from("faqs").insert(rows);
  if (error) return `Error: ${error.message}`;
  return `${rows.length} FAQs seeded`;
}

async function seedGuides(supabase: any, guideCategories: any[]): Promise<string> {
  const rows: any[] = [];
  for (const cat of guideCategories) {
    for (const g of cat.guides || []) {
      rows.push({
        title: g.title,
        slug: (g.slug || g.id).toLowerCase(),
        description: g.summary || null,
        category: cat.id,
        tags: g.keywords || [],
        related_apps: g.relatedAppIds || [],
        related_extensions: g.relatedExtensionIds || [],
        status: "approved",
      });
    }
  }

  const { error } = await supabase.from("guides").upsert(rows, { onConflict: "slug" });
  if (error) return `Error: ${error.message}`;
  return `${rows.length} guides seeded`;
}

async function seedSettings(supabase: any) {
  const defaultSettings = [
    { key: "site_name", value: JSON.stringify("Miyomi"), category: "general", description: "Site name" },
    { key: "site_description", value: JSON.stringify("Discover manga and anime apps"), category: "general", description: "Site description" },
    { key: "maintenance_mode", value: JSON.stringify(false), category: "general", description: "Enable maintenance mode" },
  ];
  for (const s of defaultSettings) {
    await supabase.from("settings").upsert(s, { onConflict: "key" });
  }
}
