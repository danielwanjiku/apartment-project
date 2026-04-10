import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type AppRole = 'owner' | 'tenant';

interface AuthState {
  user: User | null;
  role: AppRole | null;
  profile: {
    full_name: string | null;
    phone: string | null;
    apartment_id: string | null;
    unit_id: string | null;
  } | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    role: null,
    profile: null,
    loading: true,
  });

  const fetchUserData = useCallback(async (user: User) => {
    // Fetch role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .limit(1);

    const role = roles && roles.length > 0 ? (roles[0].role as AppRole) : null;

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, apartment_id, unit_id')
      .eq('user_id', user.id)
      .maybeSingle();

    setAuthState({
      user,
      role,
      profile: profile || null,
      loading: false,
    });
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Use setTimeout to avoid deadlocks with Supabase auth
          setTimeout(() => fetchUserData(session.user), 0);
        } else {
          setAuthState({ user: null, role: null, profile: null, loading: false });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserData(session.user);
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const assignRole = useCallback(async (userId: string, role: AppRole) => {
    await supabase.from('user_roles').insert({ user_id: userId, role });
  }, []);

  const updateProfile = useCallback(async (userId: string, data: {
    apartment_id?: string;
    unit_id?: string;
    full_name?: string;
    phone?: string;
  }) => {
    await supabase.from('profiles').update(data).eq('user_id', userId);
  }, []);

  const refresh = useCallback(async () => {
    if (authState.user) {
      await fetchUserData(authState.user);
    }
  }, [authState.user, fetchUserData]);

  return {
    ...authState,
    signOut,
    assignRole,
    updateProfile,
    refresh,
  };
};
