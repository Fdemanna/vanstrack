// supabase/functions/reset-password/index.ts
// Edge Function para restablecer contraseña de un trabajador
// Despliega con: supabase functions deploy reset-password
//
// VARIABLES DE ENTORNO necesarias en Supabase Dashboard > Project Settings > Edge Functions:
//   ALLOWED_ORIGIN=https://tu-dominio-produccion.com

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── SEC-01: CORS restringido al origen configurado ───────────────────────────
function buildCorsHeaders(requestOrigin: string): Record<string, string> {
  const allowed = Deno.env.get("ALLOWED_ORIGIN") ?? "";

  const isAllowed = allowed
    ? requestOrigin === allowed
    : requestOrigin.startsWith("http://localhost") ||
      requestOrigin.startsWith("http://127.0.0.1");

  return {
    "Access-Control-Allow-Origin": isAllowed ? requestOrigin : (allowed || ""),
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

    // ── SEC-02: Verificar rol desde tabla profiles (no user_metadata) ─────────
    const { data: callerProfile, error: callerProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", caller.id)
        .single();

    if (callerProfileError || callerProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Solo los administradores pueden resetear contraseñas" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Parsear body ───────────────────────────────────────────────────────
    const { userId, password } = await req.json();

    if (!userId || !password) {
      return new Response(
        JSON.stringify({ error: "Campos requeridos: userId, password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No permitir auto-reset desde este panel
    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ error: "No puedes restablecer tu propia contraseña desde este panel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SEC-04: Verificar jerarquía — solo se puede resetear a workers ────────
    // Un admin NO puede resetear la contraseña de otro admin
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (targetError || !targetProfile) {
      return new Response(
        JSON.stringify({ error: "Usuario no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetProfile.role === "admin") {
      return new Response(
        JSON.stringify({
          error: "No puedes resetear la contraseña de otro administrador",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Resetear contraseña en Supabase Auth ───────────────────────────────
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Marcar password_changed = false para forzar cambio en próximo login ─
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ password_changed: false })
      .eq("id", userId);

    if (profileError) {
      return new Response(
        JSON.stringify({ error: `Error al actualizar perfil: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Contraseña restablecida correctamente" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
