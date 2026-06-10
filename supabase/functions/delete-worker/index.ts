// supabase/functions/delete-worker/index.ts
// Edge Function para eliminar a un trabajador (Worker)
// Despliega con: supabase functions deploy delete-worker
//
// VARIABLES DE ENTORNO necesarias:
//   ALLOWED_ORIGIN=https://tu-dominio-produccion.com

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS restringido al origen configurado ───────────────────────────
function buildCorsHeaders(requestOrigin: string): Record<string, string> {
  const allowed = Deno.env.get("ALLOWED_ORIGIN") ?? "";

  const isAllowed =
    (allowed && requestOrigin === allowed) ||
    requestOrigin.startsWith("http://localhost") ||
    requestOrigin.startsWith("http://127.0.0.1");

  return {
    "Access-Control-Allow-Origin": isAllowed ? requestOrigin : (allowed || "*"),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const corsHeaders = buildCorsHeaders(origin);

  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método no permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ── 1. Verificar token del caller ─────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: callerError } =
      await supabaseUser.auth.getUser();

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Cliente admin para operaciones privilegiadas ───────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── 3. Verificar rol y company_id desde tabla profiles ─────────────────────────
    const { data: callerProfile, error: callerProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role, company_id")
        .eq("id", caller.id)
        .single();

    if (callerProfileError || callerProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Solo los administradores pueden eliminar usuarios" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Parsear body ───────────────────────────────────────────────────────
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Campos requeridos: userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ error: "No puedes eliminar tu propia cuenta desde este panel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Verificar jerarquía — solo se puede eliminar a workers de misma compañía ────────
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("role, company_id")
      .eq("id", userId)
      .single();

    if (targetError || !targetProfile) {
      return new Response(
        JSON.stringify({ error: "Usuario no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetProfile.company_id !== callerProfile.company_id) {
      return new Response(
        JSON.stringify({ error: "El usuario no pertenece a tu compañía" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetProfile.role === "admin") {
      return new Response(
        JSON.stringify({
          error: "No puedes eliminar a otro administrador",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 6. Eliminar usuario de Supabase Auth ───────────────────────────────
    // Esto debería eliminar en cascada el perfil de la tabla "profiles" si la base de datos está bien configurada
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: `Error al eliminar el usuario en Auth: ${deleteError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Por seguridad, intentamos eliminar de perfiles manualmente si no hay ON DELETE CASCADE configurado.
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    return new Response(
      JSON.stringify({ message: "Usuario eliminado correctamente" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Error interno del servidor: ${err.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
