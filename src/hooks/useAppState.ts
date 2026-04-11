import { useState, useEffect, useCallback } from 'react';
import { AppState, getDefaultState, Tenant } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'property-mgmt-state';

const migrateTenant = (t: any): Tenant => {
  if (t.paidMonths && !t.payments) {
    const payments: Record<string, number> = {};
    for (const month of t.paidMonths) {
      payments[month] = t.monthlyRent || 0;
    }
    const { paidMonths, ...rest } = t;
    return { ...rest, idNumber: rest.idNumber || '', payments };
  }
  return { ...t, idNumber: t.idNumber || '', payments: t.payments || {} };
};

const loadApartmentFromDb = async (): Promise<AppState | null> => {
  try {
    const { data: apt } = await supabase
      .from('apartments')
      .select('*')
      .eq('configured', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!apt) return null;

    const { data: dbTenants } = await supabase
      .from('tenants')
      .select('*')
      .eq('apartment_id', apt.id);

    const tenants: Tenant[] = [];
    for (const t of dbTenants || []) {
      const { data: pData } = await supabase
        .from('payments')
        .select('month, amount')
        .eq('tenant_id', t.id)
        .neq('payment_method', 'deposit');

      const payments: Record<string, number> = {};
      for (const p of pData || []) {
        payments[p.month] = (payments[p.month] || 0) + p.amount;
      }

      tenants.push({
        id: t.id,
        unitId: t.unit_id,
        name: t.name,
        idNumber: t.id_number || '',
        contact: t.contact,
        monthlyRent: t.monthly_rent,
        securityDeposit: t.security_deposit,
        moveInDate: t.move_in_date,
        payments,
      });
    }

    return {
      apartmentName: apt.name,
      floors: (apt.floors as any) || [],
      tenants,
      configured: apt.configured,
    };
  } catch {
    return null;
  }
};

export const useAppState = () => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tenants) parsed.tenants = parsed.tenants.map(migrateTenant);
        return parsed;
      }
    } catch {}
    return getDefaultState();
  });

  const [loadedFromDb, setLoadedFromDb] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Wait for auth to be ready before loading
      const { data: { session } } = await supabase.auth.getSession();

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setLoadedFromDb(true);
        // Refresh from DB in background if logged in
        if (session) {
          const fresh = await loadApartmentFromDb();
          if (fresh) setState(fresh);
        }
        return;
      }

      // No local data — load from DB if logged in
      if (session) {
        const fresh = await loadApartmentFromDb();
        if (fresh) setState(fresh);
      }
      setLoadedFromDb(true);
    };

    init();
  }, []);

  useEffect(() => {
    if (loadedFromDb) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, loadedFromDb]);

  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState(updater);
  }, []);

  return { state, updateState, loadedFromDb };
};
