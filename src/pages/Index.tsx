import { useState, useCallback, useEffect } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { supabase } from '@/integrations/supabase/client';
import { FloorConfig, Tenant, getArrearsMonths, shouldShowReminder } from '@/lib/types';
import Navbar from '@/components/dashboard/Navbar';
import SetupWizard from '@/components/dashboard/SetupWizard';
import FloorSection from '@/components/dashboard/FloorSection';
import AddTenantDialog from '@/components/dashboard/AddTenantDialog';
import DeleteTenantDialog from '@/components/dashboard/DeleteTenantDialog';
import SettingsDialog from '@/components/dashboard/SettingsDialog';
import StatsCards from '@/components/dashboard/StatsCards';
import SearchBar from '@/components/dashboard/SearchBar';
import PaymentDialog from '@/components/dashboard/PaymentDialog';

const Index = () => {
  const { state, updateState } = useAppState();
  const [showDuesOnly, setShowDuesOnly] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addTenantUnit, setAddTenantUnit] = useState<string | null>(null);
  const [deleteTenantId, setDeleteTenantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentTarget, setPaymentTarget] = useState<{ tenantId: string; month: string } | null>(null);
  const [apartmentDbId, setApartmentDbId] = useState<string | null>(null);

  const duesCount = state.tenants.filter((t) => getArrearsMonths(t).length > 0).length;
  const reminder = shouldShowReminder(state.apartmentName);
  const unpaidExists = state.tenants.some((t) => getArrearsMonths(t).length > 0);

  // Sync apartment to database when configured
  useEffect(() => {
    const syncToDb = async () => {
      if (!state.configured || !state.apartmentName) return;

      // Check if apartment exists in DB
      const { data: existing } = await supabase
        .from('apartments')
        .select('id')
        .eq('name', state.apartmentName)
        .limit(1)
        .maybeSingle();

      if (existing) {
        setApartmentDbId(existing.id);
        // Update floors
        await supabase.from('apartments').update({
          floors: state.floors as any,
          configured: true,
        }).eq('id', existing.id);
      } else {
        const { data: newApt } = await supabase.from('apartments').insert({
          name: state.apartmentName,
          floors: state.floors as any,
          configured: true,
        }).select('id').single();
        if (newApt) setApartmentDbId(newApt.id);
      }
    };
    syncToDb();
  }, [state.configured, state.apartmentName, state.floors]);

  // Sync tenants to DB & load payments from DB
  useEffect(() => {
    if (!apartmentDbId) return;

    const syncTenants = async () => {
      for (const tenant of state.tenants) {
        const { data: existing } = await supabase
          .from('tenants')
          .select('id')
          .eq('apartment_id', apartmentDbId)
          .eq('unit_id', tenant.unitId)
          .maybeSingle();

        if (!existing) {
          await supabase.from('tenants').insert({
            id: tenant.id,
            apartment_id: apartmentDbId,
            unit_id: tenant.unitId,
            name: tenant.name,
            contact: tenant.contact,
            monthly_rent: tenant.monthlyRent,
            security_deposit: tenant.securityDeposit,
            move_in_date: tenant.moveInDate,
          });
        }
      }
    };
    syncTenants();
  }, [apartmentDbId, state.tenants]);

  // Poll for new payments from DB (from tenant portal)
  useEffect(() => {
    if (!apartmentDbId) return;

    const pollPayments = async () => {
      const { data: dbTenants } = await supabase
        .from('tenants')
        .select('id, unit_id')
        .eq('apartment_id', apartmentDbId);

      if (!dbTenants) return;

      for (const dbT of dbTenants) {
        const { data: payments } = await supabase
          .from('payments')
          .select('month, amount')
          .eq('tenant_id', dbT.id);

        if (!payments || payments.length === 0) continue;

        // Sum payments by month
        const paymentMap: Record<string, number> = {};
        for (const p of payments) {
          paymentMap[p.month] = (paymentMap[p.month] || 0) + p.amount;
        }

        // Update local state if different
        updateState((prev) => ({
          ...prev,
          tenants: prev.tenants.map((t) => {
            if (t.unitId === dbT.unit_id || t.id === dbT.id) {
              const merged = { ...t.payments };
              let changed = false;
              for (const [month, amount] of Object.entries(paymentMap)) {
                if ((merged[month] || 0) < amount) {
                  merged[month] = amount;
                  changed = true;
                }
              }
              if (changed) return { ...t, payments: merged };
            }
            return t;
          }),
        }));
      }
    };

    pollPayments();
    const interval = setInterval(pollPayments, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [apartmentDbId, updateState]);

  const handleSetup = useCallback((name: string, floors: FloorConfig[]) => {
    updateState((prev) => ({ ...prev, apartmentName: name, floors, configured: true }));
  }, [updateState]);

  const handleAddTenant = useCallback((data: { name: string; contact: string; monthlyRent: number; securityDeposit: number; moveInDate: string }) => {
    if (!addTenantUnit) return;
    const tenant: Tenant = {
      id: crypto.randomUUID(),
      unitId: addTenantUnit,
      ...data,
      payments: {},
    };
    updateState((prev) => ({ ...prev, tenants: [...prev.tenants, tenant] }));
    setAddTenantUnit(null);
  }, [addTenantUnit, updateState]);

  const handleMarkPaid = useCallback((tenantId: string, month: string) => {
    setPaymentTarget({ tenantId, month });
  }, []);

  const handleRecordPayment = useCallback(async (tenantId: string, month: string, amount: number) => {
    // Update local state
    updateState((prev) => ({
      ...prev,
      tenants: prev.tenants.map((t) =>
        t.id === tenantId
          ? { ...t, payments: { ...t.payments, [month]: (t.payments[month] || 0) + amount } }
          : t
      ),
    }));

    // Also write to DB
    await supabase.from('payments').insert({
      tenant_id: tenantId,
      month,
      amount,
      payment_method: 'manual',
    });
  }, [updateState]);

  const handleDeleteTenant = useCallback(async () => {
    if (!deleteTenantId) return;
    updateState((prev) => ({
      ...prev,
      tenants: prev.tenants.filter((t) => t.id !== deleteTenantId),
    }));
    // Also delete from DB
    await supabase.from('tenants').delete().eq('id', deleteTenantId);
    setDeleteTenantId(null);
  }, [deleteTenantId, updateState]);

  const handleUpdateName = useCallback(async (name: string) => {
    updateState((prev) => ({ ...prev, apartmentName: name }));
    if (apartmentDbId) {
      await supabase.from('apartments').update({ name }).eq('id', apartmentDbId);
    }
  }, [updateState, apartmentDbId]);

  if (!state.configured) {
    return <SetupWizard onComplete={handleSetup} />;
  }

  const deletingTenant = state.tenants.find((t) => t.id === deleteTenantId);
  const payingTenant = paymentTarget ? state.tenants.find((t) => t.id === paymentTarget.tenantId) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        apartmentName={state.apartmentName}
        duesCount={duesCount}
        showDuesOnly={showDuesOnly}
        onToggleDues={() => setShowDuesOnly((p) => !p)}
        onOpenSettings={() => setSettingsOpen(true)}
        reminderMessage={reminder.show && unpaidExists ? reminder.message : null}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <StatsCards tenants={state.tenants} floors={state.floors} />
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {state.floors.map((floor) => (
          <FloorSection
            key={floor.floorIndex}
            floor={floor}
            tenants={state.tenants}
            showDuesOnly={showDuesOnly}
            searchQuery={searchQuery}
            onAddTenant={(unitId) => setAddTenantUnit(unitId)}
            onMarkPaid={handleMarkPaid}
            onDeleteTenant={(id) => setDeleteTenantId(id)}
          />
        ))}

        {showDuesOnly && duesCount === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="font-heading text-lg">All tenants are paid up! 🎉</p>
          </div>
        )}
      </main>

      <AddTenantDialog
        open={!!addTenantUnit}
        onClose={() => setAddTenantUnit(null)}
        unitId={addTenantUnit || ''}
        onAdd={handleAddTenant}
      />

      <DeleteTenantDialog
        open={!!deleteTenantId}
        onClose={() => setDeleteTenantId(null)}
        tenantName={deletingTenant?.name || ''}
        onConfirm={handleDeleteTenant}
      />

      <PaymentDialog
        open={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        tenant={payingTenant || null}
        month={paymentTarget?.month || ''}
        onPay={handleRecordPayment}
      />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apartmentName={state.apartmentName}
        floors={state.floors}
        onSave={handleUpdateName}
      />
    </div>
  );
};

export default Index;
