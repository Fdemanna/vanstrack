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

-- 2. Limpiar TODAS las políticas problemáticas de `profiles`
DROP POLICY IF EXISTS "Ver perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Ver propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Leer propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Ver perfiles misma compañía" ON public.profiles;
DROP POLICY IF EXISTS "Leer perfiles misma compañía" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizarse a sí mismos" ON public.profiles;
DROP POLICY IF EXISTS "Admin puede actualizar perfiles de su compañía" ON public.profiles;

-- 3. Reescribir políticas de `profiles` usando las funciones seguras
-- Lectura: Puedes leer tu propio perfil, o los de tu misma compañía
CREATE POLICY "Profiles SELECT" ON public.profiles FOR SELECT
USING (
  id = auth.uid() OR 
  company_id = public.get_my_company_id()
);

-- Actualización: Te actualizas a ti mismo, o un admin actualiza a los de su compañía
CREATE POLICY "Profiles UPDATE" ON public.profiles FOR UPDATE
USING (
  id = auth.uid() OR
  (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id())
)
WITH CHECK (
  id = auth.uid() OR
  (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id())
);

-- 4. Optimizar las políticas de las otras tablas usando las funciones (Mejora drástica de rendimiento)
-- VANS
DROP POLICY IF EXISTS "Ver vans misma compañía" ON public.vans;
DROP POLICY IF EXISTS "Admin puede gestionar vans de su compañía" ON public.vans;

CREATE POLICY "Vans SELECT" ON public.vans FOR SELECT
USING (company_id = public.get_my_company_id());

CREATE POLICY "Vans ALL ADMIN" ON public.vans FOR ALL
USING (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id());

-- DELIVERIES
DROP POLICY IF EXISTS "Ver entregas misma compañía" ON public.deliveries;
DROP POLICY IF EXISTS "Workers pueden registrar entregas en su compañía" ON public.deliveries;
DROP POLICY IF EXISTS "Admin puede gestionar entregas" ON public.deliveries;

CREATE POLICY "Deliveries SELECT" ON public.deliveries FOR SELECT
USING (company_id = public.get_my_company_id());

CREATE POLICY "Deliveries INSERT WORKER" ON public.deliveries FOR INSERT
WITH CHECK (user_id = auth.uid() AND company_id = public.get_my_company_id());

CREATE POLICY "Deliveries ALL ADMIN" ON public.deliveries FOR ALL
USING (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id());

-- EXPENSES
DROP POLICY IF EXISTS "Ver gastos misma compañía" ON public.expenses;
DROP POLICY IF EXISTS "Workers pueden registrar gastos en su compañía" ON public.expenses;
DROP POLICY IF EXISTS "Admin puede gestionar gastos" ON public.expenses;

CREATE POLICY "Expenses SELECT" ON public.expenses FOR SELECT
USING (company_id = public.get_my_company_id());

CREATE POLICY "Expenses INSERT WORKER" ON public.expenses FOR INSERT
WITH CHECK (user_id = auth.uid() AND company_id = public.get_my_company_id());

CREATE POLICY "Expenses ALL ADMIN" ON public.expenses FOR ALL
USING (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id());
