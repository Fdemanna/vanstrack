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

    // Cliente Admin para bypass RLS (necesario para rate limits y createUser)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── RATE LIMITING BASADO EN IP ──────────────────────────────────────────
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (ip !== "unknown") {
      const { data: limitData } = await supabaseAdmin
        .from("registration_logs")
        .select("*")
        .eq("ip", ip)
        .single();

      const now = Date.now();
      if (limitData) {
        const lastAttempt = new Date(limitData.last_attempt).getTime();
        // Reset attempts si pasó más de 1 hora
        if (now - lastAttempt > 3600000) {
          await supabaseAdmin.from("registration_logs").update({ attempts: 1, last_attempt: new Date().toISOString() }).eq("ip", ip);
        } else if (limitData.attempts >= 5) {
          return new Response(
            JSON.stringify({ error: "Demasiados intentos. Intente más tarde." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          await supabaseAdmin.from("registration_logs").update({ attempts: limitData.attempts + 1, last_attempt: new Date().toISOString() }).eq("ip", ip);
        }
      } else {
        await supabaseAdmin.from("registration_logs").insert({ ip, attempts: 1 });
      }
    }

    // ── CREACIÓN DE USUARIO (Transacción Atómica vía Trigger DB) ──────────────
    // Al pasar `company_name`, el trigger en `auth.users` creará automáticamente
    // la tabla `companies` y `profiles`, sin riesgo de registros huérfanos.
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { 
        role: 'admin', 
        name: adminName,
        company_name: companyName 
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
