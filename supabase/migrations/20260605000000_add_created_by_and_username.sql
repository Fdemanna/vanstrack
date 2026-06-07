-- 1. Agregar columna created_by a profiles para enlazar cuentas
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Agregar columna username (única y opcional)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 3. Agregar columna password_changed para forzar cambio de contraseña en primer login
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.created_by IS 'ID del administrador que creó esta cuenta';
COMMENT ON COLUMN public.profiles.username IS 'Nombre de usuario único para inicio de sesión';
COMMENT ON COLUMN public.profiles.password_changed IS 'Indica si el usuario ya cambió su contraseña inicial obligatoria';
