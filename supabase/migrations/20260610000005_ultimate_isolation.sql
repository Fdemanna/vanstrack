-- 1. ENCENDER RLS POR LA FUERZA Y BLOQUEAR BYPASS
-- Esto asegura que ni siquiera dueños de tabla puedan bypassear RLS desde el cliente.
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.vans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vans FORCE ROW LEVEL SECURITY;

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries FORCE ROW LEVEL SECURITY;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses FORCE ROW LEVEL SECURITY;

-- 2. PULVERIZAR TODAS LAS POLÍTICAS EXISTENTES
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'vans', 'deliveries', 'expenses', 'companies') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 3. FUNCIONES SEGURAS PARA LEER EL USUARIO ACTUAL SIN RECURSIÓN
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 4. POLÍTICAS DE AISLAMIENTO TOTAL (STRICT)
CREATE POLICY "Strict Companies" ON public.companies FOR SELECT
USING (id = public.get_my_company_id());

CREATE POLICY "Strict Profiles SELECT" ON public.profiles FOR SELECT
USING (id = auth.uid() OR company_id = public.get_my_company_id());

CREATE POLICY "Strict Profiles UPDATE" ON public.profiles FOR UPDATE
USING (id = auth.uid() OR (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id()))
WITH CHECK (id = auth.uid() OR (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id()));

CREATE POLICY "Strict Vans SELECT" ON public.vans FOR SELECT
USING (company_id = public.get_my_company_id());

CREATE POLICY "Strict Vans ALL ADMIN" ON public.vans FOR ALL
USING (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id());

CREATE POLICY "Strict Deliveries SELECT" ON public.deliveries FOR SELECT
USING (company_id = public.get_my_company_id());

CREATE POLICY "Strict Deliveries WORKER" ON public.deliveries FOR INSERT
WITH CHECK (user_id = auth.uid() AND company_id = public.get_my_company_id());

CREATE POLICY "Strict Deliveries ADMIN" ON public.deliveries FOR ALL
USING (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id());

CREATE POLICY "Strict Expenses SELECT" ON public.expenses FOR SELECT
USING (company_id = public.get_my_company_id());

CREATE POLICY "Strict Expenses WORKER" ON public.expenses FOR INSERT
WITH CHECK (user_id = auth.uid() AND company_id = public.get_my_company_id());

CREATE POLICY "Strict Expenses ADMIN" ON public.expenses FOR ALL
USING (public.get_my_role() = 'admin' AND company_id = public.get_my_company_id());

-- 5. TRIGGER AUTOMÁTICO PARA ASIGNAR LA COMPAÑÍA EN INSERTS
CREATE OR REPLACE FUNCTION public.set_company_id_from_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.get_my_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_company_vans ON public.vans;
CREATE TRIGGER trg_set_company_vans BEFORE INSERT ON public.vans FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_profile();

DROP TRIGGER IF EXISTS trg_set_company_deliveries ON public.deliveries;
CREATE TRIGGER trg_set_company_deliveries BEFORE INSERT ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_profile();

DROP TRIGGER IF EXISTS trg_set_company_expenses ON public.expenses;
CREATE TRIGGER trg_set_company_expenses BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_profile();

-- 6. AUDITORÍA: Mostrar el estado de los perfiles para que puedas revisarlo
-- Esto se mostrará en la pestaña de "Results" en Supabase.
SELECT p.name AS nombre, p.role AS rol, c.name AS empresa, p.company_id 
FROM public.profiles p 
LEFT JOIN public.companies c ON p.company_id = c.id;
