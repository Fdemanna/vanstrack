-- 1. ACTIVAR RLS EN TODAS LAS TABLAS (Si esto estaba apagado, las políticas no hacían nada y todos veían todo)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. ASEGURAR QUE LOS NUEVOS DATOS (Vans, Entregas, Gastos) SE ASIGNEN A LA COMPAÑÍA DEL USUARIO
-- Si el frontend no envía el company_id, esta función lo rellena automáticamente usando el perfil del usuario.
CREATE OR REPLACE FUNCTION public.set_company_id_from_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Borrar triggers viejos por si acaso
DROP TRIGGER IF EXISTS trg_set_company_vans ON public.vans;
DROP TRIGGER IF EXISTS trg_set_company_deliveries ON public.deliveries;
DROP TRIGGER IF EXISTS trg_set_company_expenses ON public.expenses;

-- Crear los triggers
CREATE TRIGGER trg_set_company_vans BEFORE INSERT ON public.vans FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_profile();
CREATE TRIGGER trg_set_company_deliveries BEFORE INSERT ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_profile();
CREATE TRIGGER trg_set_company_expenses BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_profile();

-- 3. FORZAR ROL DE ADMIN AL PRIMER USUARIO (Para arreglar tu cuenta antigua)
-- Esto buscará a la primera compañía ('VanTrack Legacy Fleet') y hará que todos los que estén ahí sean admins,
-- para que recuperes el acceso a tu cuenta vieja.
UPDATE public.profiles 
SET role = 'admin' 
WHERE company_id = (SELECT id FROM public.companies WHERE name = 'VanTrack Legacy Fleet' LIMIT 1);

-- 4. Asegurarnos que no queden datos huérfanos sin compañía
UPDATE public.vans SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.deliveries SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.expenses SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
