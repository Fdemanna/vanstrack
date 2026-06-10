  -- REVERTIR TRABAJADORES A SU ROL ORIGINAL
  -- Como mi script anterior convirtió a TODOS los de la flota antigua en admin por seguridad,
  -- ahora devolvemos a los demás a su rol de 'worker', manteniendo solo a Francisco como 'admin'.

  UPDATE public.profiles
  SET role = 'worker'
  WHERE name != 'Francisco' 
    AND company_id = (SELECT id FROM public.companies WHERE name = 'VanTrack Legacy Fleet' LIMIT 1);
