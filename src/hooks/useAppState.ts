import { useState, useEffect, useCallback } from 'react';
import { AppState, getDefaultState, Tenant } from '@/lib/types';

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

export const useAppState = () => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tenants) {
          parsed.tenants = parsed.tenants.map(migrateTenant);
        }
        return parsed;
      }
    } catch {}
    return getDefaultState();
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState(updater);
  }, []);

  return { state, updateState };
};
