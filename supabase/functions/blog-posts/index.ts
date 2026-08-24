import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  // We use service role key here to securely bypass RLS and apply our own logical checks
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    let body: any = {};
    if (req.method === "POST") {
        try {
            body = await req.json();
        } catch(e) {}
    }

    // We can accept parameters from URL search params (GET) or body (POST)
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug") || body.slug;
    const category = url.searchParams.get("category") || body.category;
    const requirePublished = (url.searchParams.get("requirePublished") === "true") || body.requirePublished;
    const limit = url.searchParams.get("limit") || body.limit;
    const incrementView = (url.searchParams.get("incrementView") === "true") || body.incrementView;

    if (slug) {
      let query = supabase.from('blog_posts').select('*');
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      if (isUuid) {
        query = query.or(`id.eq.${slug},slug.eq.${slug}`);
      } else {
        query = query.eq('slug', slug);
      }

      if (requirePublished) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query.limit(1);
      if (error) throw error;
      
      const post = data && data.length > 0 ? data[0] : null;

      if (post && incrementView) {
         supabase.rpc('increment_blog_view', { blog_id: post.id }).catch(e => console.error("Failed to increment views:", e));
      }

      return new Response(JSON.stringify({ data: post }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } else {
      let query = supabase
          .from('blog_posts')
          .select('*')
          .order('is_pinned', { ascending: false })
          .order('published_at', { ascending: false, nullsFirst: false });

      if (requirePublished) {
          query = query.eq('status', 'published');
      }
      
      if (category && category !== 'All') {
          query = query.eq('category', category);
      }

      if (limit) {
          query = query.limit(parseInt(limit, 10));
      }

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  } catch (error: any) {
    console.error("Error fetching blog posts:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
