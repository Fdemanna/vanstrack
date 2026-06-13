-- 1. Tabla para Rate Limiting
CREATE TABLE IF NOT EXISTS public.registration_logs (
  ip TEXT PRIMARY KEY,
  attempts INT DEFAULT 1,
  last_attempt TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para que sea inaccesible por los clientes (API anon/authenticated)
ALTER TABLE public.registration_logs ENABLE ROW LEVEL SECURITY;
-- No creamos políticas, por lo que el acceso público está bloqueado (default-deny).
-- Solo el rol service_role podrá leer/escribir.

-- 2. Función Trigger para creación atómica de usuarios, perfiles y compañías
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Verificar si es la creación de un nuevo admin registrando su compañía
  IF NEW.raw_user_meta_data->>'company_name' IS NOT NULL THEN
    
    INSERT INTO public.companies (name)
    VALUES (NEW.raw_user_meta_data->>'company_name')
    RETURNING id INTO v_company_id;
    
    INSERT INTO public.profiles (id, name, role, company_id, password_changed)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'Sin nombre'),
      'admin',
      v_company_id,
      true
    );

  -- Verificar si es la creación de un trabajador por parte de un admin
  ELSIF NEW.raw_user_meta_data->>'company_id' IS NOT NULL THEN
    
    v_company_id := (NEW.raw_user_meta_data->>'company_id')::uuid;

    INSERT INTO public.profiles (id, name, role, company_id, password_changed)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'Sin nombre'),
      COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
      v_company_id,
      false
    );

  ELSE
    -- Failsafe: En nuestro modelo MVP todo usuario debe tener company_id.
    -- Rechazar la creación lanzando error (GoTrue abortará el registro)
    RAISE EXCEPTION 'A user must be created with either company_name or company_id in their metadata.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear el Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
