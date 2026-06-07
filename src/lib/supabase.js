import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan las variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_PUBLISHABLE_KEY. ' +
    'Crea un archivo .env.local en la raíz del proyecto.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
