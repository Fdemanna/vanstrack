-- BORRAR TODAS LAS POLÍTICAS DE SEGURIDAD EXISTENTES EN LAS TABLAS
-- A veces Supabase crea políticas por defecto como "Enable read access for all users"
-- que anulan cualquier otra regla estricta que pongamos.
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'vans', 'deliveries', 'expenses', 'companies') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- POR SI ACASO EL BLOQUE ANTERIOR FALLA, FORZAR EL BORRADO EXPLÍCITO:
DROP POLICY IF EXISTS "Companies SELECT" ON public.companies;
DROP POLICY IF EXISTS "Profiles SELECT" ON public.profiles;
DROP POLICY IF EXISTS "Profiles UPDATE" ON public.profiles;
DROP POLICY IF EXISTS "Vans SELECT" ON public.vans;
DROP POLICY IF EXISTS "Vans ALL ADMIN" ON public.vans;
DROP POLICY IF EXISTS "Deliveries SELECT" ON public.deliveries;
DROP POLICY IF EXISTS "Deliveries INSERT WORKER" ON public.deliveries;
DROP POLICY IF EXISTS "Deliveries ALL ADMIN" ON public.deliveries;
DROP POLICY IF EXISTS "Expenses SELECT" ON public.expenses;
DROP POLICY IF EXISTS "Expenses INSERT WORKER" ON public.expenses;
DROP POLICY IF EXISTS "Expenses ALL ADMIN" ON public.expenses;

-- ASEGURAR QUE LAS FUNCIONES SEGURAS EXISTEN
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- RECREAR POLÍTICAS ESTRICTAS PARA COMPANIES
CREATE POLICY "Companies SELECT" ON public.companies FOR SELECT
USING (id = public.get_my_company_id());

-- RECREAR POLÍTICAS ESTRICTAS PARA PROFILES
CREATE POLICY "Profiles SELECT" ON public.profiles FOR SELECT
USING (
  id = auth.uid() OR 
  company_id = public.get_my_company_id()
);

CREATE POLICY "Profiles UPDATE" ON public.profiles FOR UPDATE
USING (
  id = auth.uid() OR
  (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id())
)
WITH CHECK (
  id = auth.uid() OR
  (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id())
);

-- RECREAR POLÍTICAS ESTRICTAS PARA VANS
CREATE POLICY "Vans SELECT" ON public.vans FOR SELECT
USING (company_id = public.get_my_company_id());

CREATE POLICY "Vans ALL ADMIN" ON public.vans FOR ALL
USING (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id());

-- RECREAR POLÍTICAS ESTRICTAS PARA DELIVERIES
CREATE POLICY "Deliveries SELECT" ON public.deliveries FOR SELECT
USING (company_id = public.get_my_company_id());

CREATE POLICY "Deliveries INSERT WORKER" ON public.deliveries FOR INSERT
WITH CHECK (user_id = auth.uid() AND company_id = public.get_my_company_id());

CREATE POLICY "Deliveries ALL ADMIN" ON public.deliveries FOR ALL
USING (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id());

-- RECREAR POLÍTICAS ESTRICTAS PARA EXPENSES
CREATE POLICY "Expenses SELECT" ON public.expenses FOR SELECT
USING (company_id = public.get_my_company_id());

CREATE POLICY "Expenses INSERT WORKER" ON public.expenses FOR INSERT
WITH CHECK (user_id = auth.uid() AND company_id = public.get_my_company_id());

CREATE POLICY "Expenses ALL ADMIN" ON public.expenses FOR ALL
USING (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id());

-- ASIGNAR COMPANY_ID A CUALQUIER PERFIL HUÉRFANO QUE HAYA QUEDADO
UPDATE public.profiles SET company_id = (SELECT id FROM public.companies WHERE name = 'VanTrack Legacy Fleet' LIMIT 1) WHERE company_id IS NULL;
