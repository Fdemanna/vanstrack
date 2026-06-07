// supabase/functions/create-worker/index.ts
// Edge Function para aprovisionar trabajadores
// Despliega con: supabase functions deploy create-worker
//
// VARIABLES DE ENTORNO necesarias en Supabase Dashboard > Project Settings > Edge Functions:
//   ALLOWED_ORIGIN=https://tu-dominio-produccion.com

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── SEC-01: CORS restringido al origen configurado (no más "*") ──────────────
function buildCorsHeaders(requestOrigin: string): Record<string, string> {
  const allowed = Deno.env.get("ALLOWED_ORIGIN") ?? "";

  // En desarrollo (sin ALLOWED_ORIGIN configurado) solo se permite localhost
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

// ── SEC-06: Regex de contraseña segura (mín 8 chars, 1 letra, 1 número) ─────
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

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

    // Cliente con la key del usuario (para verificar sesión válida)
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

    // ── 2. Crear cliente admin para operaciones privilegiadas ─────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── SEC-02: Verificar rol desde tabla profiles (fuente de verdad, protegida
    //            por RLS) en lugar de user_metadata (mutable por el cliente) ───
    const { data: callerProfile, error: profileReadError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (profileReadError || callerProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Solo los administradores pueden crear trabajadores" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Parsear y validar body ─────────────────────────────────────────────
    const { username, password, name, role } = await req.json();

    if (!username || !password || !name || !role) {
      return new Response(
        JSON.stringify({ error: "Campos requeridos: username, password, name, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (role !== "admin" && role !== "worker") {
      return new Response(
        JSON.stringify({ error: "Rol inválido. Debe ser admin o worker" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SEC-06: Validar fuerza de contraseña (mín 8 chars, 1 letra, 1 número) ─
    if (!PASSWORD_REGEX.test(password)) {
      return new Response(
        JSON.stringify({
          error: "La contraseña debe tener al menos 8 caracteres, incluir una letra y un número",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isEmail = username.includes("@");
    const emailVal = isEmail
      ? username.trim().toLowerCase()
      : `${username.trim().toLowerCase()}@local.vanstrack`;
    const usernameVal = isEmail ? null : username.trim().toLowerCase();

    // ── 4. Crear usuario con service_role (salta RLS) ─────────────────────────
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: emailVal,
        password,
        email_confirm: true,
        user_metadata: { role, name },
      });

    if (createError) {
      const status = createError.message.includes("already") ? 409 : 400;
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Actualizar perfil con username, created_by, role y password_changed = false
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        role,
        name,
        username: usernameVal,
        created_by: caller.id,
        password_changed: false,
      })
      .eq("id", newUser.user.id);

    if (profileError) {
      // Rollback: eliminar el usuario si falla la actualización del perfil
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Error al actualizar perfil: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Respuesta exitosa ──────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        message: "Usuario creado correctamente",
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          username: usernameVal,
          name,
          role,
        },
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
