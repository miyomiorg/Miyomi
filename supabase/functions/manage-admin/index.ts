import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
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

    const { action, email, password, display_name, role, user_id, page, per_page } = await req.json();

    // ─── LIST USERS ───
    if (action === "list_users") {
      const currentPage = page || 1;
      const perPage = per_page || 50;

      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: currentPage,
        perPage: perPage,
      });

      if (listError) {
        return new Response(
          JSON.stringify({ error: listError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userIds = usersData.users.map((u) => u.id);

      // Fetch roles for all users
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap: Record<string, string> = {};
      if (roles) {
        for (const r of roles) {
          roleMap[r.user_id] = r.role;
        }
      }

      // Fetch admin records for all users
      const { data: adminRecords } = await supabaseAdmin
        .from("admins")
        .select("user_id, display_name, is_active, avatar_url")
        .in("user_id", userIds);

      const adminMap: Record<string, { display_name: string | null; is_active: boolean; avatar_url: string | null }> = {};
      if (adminRecords) {
        for (const a of adminRecords) {
          if (a.user_id) {
            adminMap[a.user_id] = {
              display_name: a.display_name,
              is_active: a.is_active,
              avatar_url: a.avatar_url,
            };
          }
        }
      }

      const enrichedUsers = usersData.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        provider: u.app_metadata?.provider || "email",
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || null,
        avatar_url: u.user_metadata?.avatar_url || null,
        role: roleMap[u.id] || null,
        is_admin: !!adminMap[u.id],
        admin_display_name: adminMap[u.id]?.display_name || null,
        admin_is_active: adminMap[u.id]?.is_active ?? null,
      }));

      return new Response(
        JSON.stringify({ users: enrichedUsers, total: usersData.users.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── PROMOTE USER TO ADMIN ───
    if (action === "promote") {
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "user_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const assignRole = role || "admin";

      // Get user details from auth
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (userError || !userData.user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userEmail = userData.user.email!;

      // Check if already has a role
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", user_id)
        .single();

      if (existingRole) {
        await supabaseAdmin.from("user_roles").update({ role: assignRole }).eq("user_id", user_id);
      } else {
        const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
          user_id,
          role: assignRole,
        });
        if (roleError) {
          return new Response(
            JSON.stringify({ error: "Failed to assign role: " + roleError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Check if already in admins table
      const { data: existingAdmin } = await supabaseAdmin
        .from("admins")
        .select("id")
        .eq("user_id", user_id)
        .single();

      if (existingAdmin) {
        await supabaseAdmin.from("admins").update({
          is_active: true,
          display_name: display_name || userData.user.user_metadata?.full_name || null,
        }).eq("user_id", user_id);
      } else {
        const { error: adminError } = await supabaseAdmin.from("admins").insert({
          email: userEmail,
          user_id,
          is_active: true,
          display_name: display_name || userData.user.user_metadata?.full_name || null,
        });
        if (adminError) {
          return new Response(
            JSON.stringify({ error: "Failed to create admin record: " + adminError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── DEMOTE USER (REMOVE ADMIN) ───
    if (action === "demote") {
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "user_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (user_id === caller.id) {
        return new Response(
          JSON.stringify({ error: "Cannot demote yourself" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      await supabaseAdmin.from("admins").delete().eq("user_id", user_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── DELETE USER (FROM AUTH ENTIRELY) ───
    if (action === "delete_user") {
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "user_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (user_id === caller.id) {
        return new Response(
          JSON.stringify({ error: "Cannot delete yourself" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Remove from admins and roles first
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      await supabaseAdmin.from("admins").delete().eq("user_id", user_id);

      // Delete from auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (deleteError) {
        return new Response(
          JSON.stringify({ error: "Failed to delete user: " + deleteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── CREATE ───
    if (action === "create") {
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "Email and password required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        console.error("Create user error:", createError.message);
        return new Response(
          JSON.stringify({ error: createError.message || "Failed to create user" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = newUser.user!.id;
      const assignRole = role || "admin";

      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: assignRole,
      });

      if (roleError) {
        console.error("Assign role error:", roleError.message);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: "Failed to assign role: " + roleError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: adminError } = await supabaseAdmin.from("admins").insert({
        email,
        user_id: userId,
        is_active: true,
        display_name: display_name || null,
      });

      if (adminError) {
        console.error("Insert admin error:", adminError.message);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: "Failed to create admin record: " + adminError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, userId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── UPDATE ───
    if (action === "update") {
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "user_id is required for update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (display_name !== undefined) {
        await supabaseAdmin
          .from("admins")
          .update({ display_name: display_name || null })
          .eq("user_id", user_id);
      }

      if (role) {
        await supabaseAdmin
          .from("user_roles")
          .update({ role })
          .eq("user_id", user_id);
      }

      if (password) {
        const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
          password,
        });
        if (pwError) {
          console.error("Password reset error:", pwError.message);
          return new Response(
            JSON.stringify({ error: "Failed to reset password: " + pwError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── DELETE (legacy - by email) ───
    if (action === "delete") {
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: adminEntry } = await supabaseAdmin
        .from("admins")
        .select("user_id")
        .eq("email", email)
        .single();

      if (adminEntry?.user_id) {
        if (adminEntry.user_id === caller.id) {
          return new Response(
            JSON.stringify({ error: "Cannot delete your own account" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabaseAdmin.from("user_roles").delete().eq("user_id", adminEntry.user_id);
        await supabaseAdmin.from("admins").delete().eq("user_id", adminEntry.user_id);
      } else {
        await supabaseAdmin.from("admins").delete().eq("email", email);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Manage admin error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
