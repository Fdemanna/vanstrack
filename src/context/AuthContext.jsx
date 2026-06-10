/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      // Persistir solo los campos esenciales (SEC-03)
      localStorage.setItem(`profile_${userId}`, JSON.stringify(minimalProfileCache(data)));
    } catch {
      const cached = localStorage.getItem(`profile_${userId}`);
      if (cached) {
        try {
          setProfile(JSON.parse(cached));
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // SEC-03: solo persistir los campos mínimos necesarios para modo offline
  // El rol es necesario para saber si es admin offline; se excluyen metadatos innecesarios
  function minimalProfileCache(profile) {
    return {
      id: profile.id,
      name: profile.name,
      role: profile.role,
      password_changed: profile.password_changed,
    };
  }

  const signIn = useCallback(async (emailOrUsername, password) => {
    const isEmail = emailOrUsername.includes('@');
    const email = isEmail ? emailOrUsername.trim().toLowerCase() : `${emailOrUsername.trim().toLowerCase()}@local.vanstrack`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (usernameOrEmail, password, name) => {
    const isEmail = usernameOrEmail.includes('@');
    const email = isEmail ? usernameOrEmail.trim().toLowerCase() : `${usernameOrEmail.trim().toLowerCase()}@local.vanstrack`;
    const usernameVal = isEmail ? null : usernameOrEmail.trim().toLowerCase();

    // 1. Registrar en Supabase Auth
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'worker',
        }
      }
    });

    if (signUpError) throw signUpError;

    if (user) {
      // 2. Actualizar/insertar el perfil con los campos correspondientes
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name,
          username: usernameVal,
          role: 'worker',
          password_changed: true // No requiere cambio de contraseña ya que la ha definido él mismo
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 3. Recargar el perfil para actualizar el estado del AuthContext en la interfaz
      await fetchProfile(user.id);
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    const userId = session?.user?.id;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    if (userId) {
      localStorage.removeItem(`profile_${userId}`);
    }
    // SEC-07: Destruir absolutamente toda la caché de React Query (Memoria + IndexedDB)
    // Esto evita que alguien lea los datos del usuario anterior desde las DevTools
    queryClient.clear();
    setSession(null);
    setProfile(null);
  }, [session, queryClient]);

  const updateProfileName = useCallback(async (newName) => {
    if (!session?.user?.id) throw new Error('No hay sesión activa');
    const { data, error } = await supabase
      .from('profiles')
      .update({ name: newName })
      .eq('id', session.user.id)
      .select()
      .single();
    
    if (error) throw error;
    setProfile(data);
    // Sincronizar la caché offline con el nombre actualizado (solo campos mínimos)
    localStorage.setItem(`profile_${session.user.id}`, JSON.stringify(minimalProfileCache(data)));
    return data;
  }, [session]);

  const changePassword = useCallback(async (newPassword) => {
    if (!session?.user?.id) throw new Error('No hay sesión activa');
    
    // 1. Actualizar contraseña en Supabase Auth
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) throw authError;

    // 2. Marcar en profiles que la contraseña ha sido cambiada
    const { data, error: profileError } = await supabase
      .from('profiles')
      .update({ password_changed: true })
      .eq('id', session.user.id)
      .select()
      .single();
    
    if (profileError) throw profileError;
    setProfile(data);
    return data;
  }, [session]);

  const value = useMemo(() => ({
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfileName,
    changePassword,
    isAdmin: profile?.role === 'admin',
  }), [session, profile, loading, signIn, signUp, signOut, updateProfileName, changePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
