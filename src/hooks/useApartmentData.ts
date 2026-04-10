import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FloorConfig } from '@/lib/types';

export interface DbTenant {
  id: string;
  apartment_id: string;
  unit_id: string;
  name: string;
  contact: string;
  monthly_rent: number;
  security_deposit: number;
  move_in_date: string;
}

export interface DbPayment {
  id: string;
  tenant_id: string;
  month: string;
  amount: number;
  payment_method: string | null;
  created_at: string;
}

export interface ApartmentData {
  id: string;
  name: string;
  floors: FloorConfig[];
  configured: boolean;
}

export const useApartmentData = (apartmentId?: string) => {
  const [apartment, setApartment] = useState<ApartmentData | null>(null);
  const [tenants, setTenants] = useState<DbTenant[]>([]);
  const [payments, setPayments] = useState<DbPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApartment = useCallback(async () => {
    let query = supabase.from('apartments').select('*');
    if (apartmentId) {
      query = query.eq('id', apartmentId);
    }
    const { data } = await query.order('created_at', { ascending: false }).limit(1).single();
    if (data) {
      setApartment({
        id: data.id,
        name: data.name,
        floors: (data.floors as any) || [],
        configured: data.configured,
      });
      return data.id;
    }
    return null;
  }, [apartmentId]);

  const fetchTenants = useCallback(async (aptId: string) => {
    const { data } = await supabase.from('tenants').select('*').eq('apartment_id', aptId);
    if (data) setTenants(data);
  }, []);

  const fetchPayments = useCallback(async (aptId: string) => {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .in('tenant_id', (await supabase.from('tenants').select('id').eq('apartment_id', aptId)).data?.map(t => t.id) || []);
    if (data) setPayments(data);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const aptId = await fetchApartment();
    if (aptId) {
      await Promise.all([fetchTenants(aptId), fetchPayments(aptId)]);
    }
    setLoading(false);
  }, [fetchApartment, fetchTenants, fetchPayments]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const recordPayment = useCallback(async (tenantId: string, month: string, amount: number, method = 'manual') => {
    await supabase.from('payments').insert({
      tenant_id: tenantId,
      month,
      amount,
      payment_method: method,
    });
    if (apartment) {
      await fetchPayments(apartment.id);
    }
  }, [apartment, fetchPayments]);

  // Helper: get payments as Record<string, number> for a tenant (summed by month)
  const getPaymentsForTenant = useCallback((tenantId: string): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const p of payments) {
      if (p.tenant_id === tenantId) {
        result[p.month] = (result[p.month] || 0) + p.amount;
      }
    }
    return result;
  }, [payments]);

  return {
    apartment,
    tenants,
    payments,
    loading,
    refresh,
    recordPayment,
    getPaymentsForTenant,
  };
};
