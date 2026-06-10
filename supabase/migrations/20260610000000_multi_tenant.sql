-- Migración: Arquitectura Multi-Tenant (Empresas separadas)

-- 1. Crear tabla de Compañías
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Añadir company_id a todas las tablas (Nullable al principio para retrocompatibilidad con datos antiguos si los hubiera)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.vans ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Crear una compañía "Default" y mover todos los registros existentes allí (Migración de datos segura)
DO $$
DECLARE
  default_company_id UUID;
BEGIN
  -- Insertamos la compañía default
  INSERT INTO public.companies (name) VALUES ('VanTrack Legacy Fleet') RETURNING id INTO default_company_id;
  
  -- Actualizamos los registros antiguos
  UPDATE public.profiles SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.vans SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.deliveries SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.expenses SET company_id = default_company_id WHERE company_id IS NULL;
END $$;

-- 3. Ahora que todos tienen un company_id, podemos hacerlo NOT NULL (opcional, pero buena práctica)
-- ALTER TABLE public.profiles ALTER COLUMN company_id SET NOT NULL; 
-- Dejaremos profiles nullable para no romper triggers antiguos temporalmente.

-- 4. Reemplazar TODAS las políticas RLS existentes
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  -- Dropear políticas actuales para perfiles, vans, entregas y gastos
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('profiles', 'vans', 'deliveries', 'expenses', 'companies') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- POLÍTICAS NUEVAS:

-- Compañías (Un admin/worker solo puede ver su propia compañía)
CREATE POLICY "Ver propia compañía" ON public.companies FOR SELECT
USING (id = (SELECT company_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- Perfiles (Pueden ver perfiles de su misma compañía)
CREATE POLICY "Ver perfiles misma compañía" ON public.profiles FOR SELECT
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admin puede actualizar perfiles de su compañía" ON public.profiles FOR UPDATE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' AND 
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' AND 
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Los workers pueden actualizar su propio perfil (ej. cambiar password)
CREATE POLICY "Usuarios pueden actualizarse a sí mismos" ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Vans (Misma lógica)
CREATE POLICY "Ver vans misma compañía" ON public.vans FOR SELECT
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admin puede gestionar vans de su compañía" ON public.vans FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' AND 
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Deliveries
CREATE POLICY "Ver entregas misma compañía" ON public.deliveries FOR SELECT
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Workers pueden registrar entregas en su compañía" ON public.deliveries FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admin puede gestionar entregas" ON public.deliveries FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' AND 
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Expenses
CREATE POLICY "Ver gastos misma compañía" ON public.expenses FOR SELECT
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Workers pueden registrar gastos en su compañía" ON public.expenses FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admin puede gestionar gastos" ON public.expenses FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' AND 
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
