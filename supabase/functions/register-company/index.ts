// supabase/functions/register-company/index.ts
// Función Edge para registrar una nueva compañía y su cuenta de administrador

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function buildCorsHeaders(requestOrigin: string): Record<string, string> {
  const allowed = Deno.env.get("ALLOWED_ORIGIN") ?? "";
  const isAllowed = 
    (allowed && requestOrigin === allowed) ||
    requestOrigin.startsWith("http://localhost") ||
    requestOrigin.startsWith("http://127.0.0.1");

  return {
    "Access-Control-Allow-Origin": isAllowed ? requestOrigin : (allowed || "*"),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const corsHeaders = buildCorsHeaders(origin);

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
    const { companyName, adminName, email, password } = await req.json();

    if (!companyName || !adminName || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Campos requeridos faltantes" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!PASSWORD_REGEX.test(password)) {
      return new Response(
        JSON.stringify({ error: "La contraseña es muy débil" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cliente Admin para bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Crear compañía
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({ name: companyName })
      .select("id")
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: "Error al crear la compañía" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Crear usuario Admin (Auth)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { role: 'admin', name: adminName },
    });

    if (createError) {
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Actualizar o crear perfil con company_id
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        role: "admin",
        name: adminName,
        company_id: company.id,
        password_changed: true,
      })
      .select()
      .single();

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      return new Response(
        JSON.stringify({ error: "Error al actualizar perfil de administrador" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Compañía registrada con éxito" }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
