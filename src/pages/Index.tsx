import { useState, useCallback, useEffect } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { supabase } from '@/integrations/supabase/client';
import { FloorConfig, Tenant, getArrearsMonths, shouldShowReminder, distributePayment } from '@/lib/types';
import Navbar from '@/components/dashboard/Navbar';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import SetupWizard from '@/components/dashboard/SetupWizard';
import FloorSection from '@/components/dashboard/FloorSection';
import AddTenantDialog from '@/components/dashboard/AddTenantDialog';
import DeleteTenantDialog from '@/components/dashboard/DeleteTenantDialog';
import EditTenantDialog from '@/components/dashboard/EditTenantDialog';
import SettingsDialog from '@/components/dashboard/SettingsDialog';
import StatsCards from '@/components/dashboard/StatsCards';
import SearchBar from '@/components/dashboard/SearchBar';
import PaymentDialog from '@/components/dashboard/PaymentDialog';
import RevenueDialog from '@/components/dashboard/RevenueDialog';
import DuesDialog from '@/components/dashboard/DuesDialog';

const Index = () => {
  const { state, updateState } = useAppState();
  const [showDuesOnly, setShowDuesOnly] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [duesOpen, setDuesOpen] = useState(false);
  const [addTenantUnit, setAddTenantUnit] = useState<string | null>(null);
  const [deleteTenantId, setDeleteTenantId] = useState<string | null>(null);
  const [editTenantId, setEditTenantId] = useState<string | null>(null);
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
            id_number: tenant.idNumber,
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
          .eq('tenant_id', dbT.id)
          .neq('payment_method', 'deposit');

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

  const handleAddTenant = useCallback((data: { name: string; idNumber: string; contact: string; monthlyRent: number; securityDeposit: number; moveInDate: string }) => {
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

  const handleRecordPayment = useCallback(async (tenantId: string, month: string, amount: number, type: 'rent' | 'deposit' = 'rent') => {
    if (type === 'rent') {
      const tenant = state.tenants.find(t => t.id === tenantId);
      if (tenant) {
        // Distribute payment across unpaid months oldest first
        const distribution = distributePayment(tenant, amount);

        // Update local state with distributed amounts
        updateState((prev) => ({
          ...prev,
          tenants: prev.tenants.map((t) => {
            if (t.id !== tenantId) return t;
            const updatedPayments = { ...t.payments };
            for (const [m, amt] of Object.entries(distribution)) {
              updatedPayments[m] = (updatedPayments[m] || 0) + amt;
            }
            return { ...t, payments: updatedPayments };
          }),
        }));

        // Write each month's allocation to DB
        for (const [m, amt] of Object.entries(distribution)) {
          await supabase.from('payments').insert({
            tenant_id: tenantId,
            month: m,
            amount: amt,
            payment_method: 'rent',
          });
        }
        return;
      }
    }

    // Deposit — just record as-is
    await supabase.from('payments').insert({
      tenant_id: tenantId,
      month,
      amount,
      payment_method: type,
    });
  }, [updateState, state.tenants]);

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

  const handleEditTenant = useCallback(async (tenantId: string, data: { name: string; idNumber: string; contact: string; monthlyRent: number; securityDeposit: number; moveInDate: string }) => {
    updateState((prev) => ({
      ...prev,
      tenants: prev.tenants.map((t) =>
        t.id === tenantId ? { ...t, ...data } : t
      ),
    }));
    await supabase.from('tenants').update({
      name: data.name,
      id_number: data.idNumber,
      contact: data.contact,
      monthly_rent: data.monthlyRent,
      security_deposit: data.securityDeposit,
      move_in_date: data.moveInDate,
    }).eq('id', tenantId);
    setEditTenantId(null);
  }, [updateState]);

  const handleUpdateSettings = useCallback(async (name: string, floors: FloorConfig[]) => {
    updateState((prev) => ({ ...prev, apartmentName: name, floors }));
    if (apartmentDbId) {
      await supabase.from('apartments').update({ name, floors: floors as any }).eq('id', apartmentDbId);
    }
  }, [updateState, apartmentDbId]);

  if (!state.configured) {
    return <SetupWizard onComplete={handleSetup} />;
  }

  const deletingTenant = state.tenants.find((t) => t.id === deleteTenantId);
  const payingTenant = paymentTarget ? state.tenants.find((t) => t.id === paymentTarget.tenantId) : null;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <DashboardSidebar
        apartmentName={state.apartmentName}
        duesCount={duesCount}
        showDuesOnly={showDuesOnly}
        onToggleDues={() => setShowDuesOnly((p) => !p)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenRevenue={() => setRevenueOpen(true)}
        onOpenDues={() => setDuesOpen(true)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          reminderMessage={reminder.show && unpaidExists ? reminder.message : null}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <StatsCards tenants={state.tenants} floors={state.floors} onOpenDues={() => setDuesOpen(true)} onOpenRevenue={() => setRevenueOpen(true)} />
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
            onEditTenant={(id) => setEditTenantId(id)}
          />
        ))}

        {showDuesOnly && duesCount === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="font-heading text-lg">All tenants are paid up! 🎉</p>
          </div>
        )}
        </main>
      </div>

      <AddTenantDialog
        open={!!addTenantUnit}
        onClose={() => setAddTenantUnit(null)}
        unitId={addTenantUnit || ''}
        onAdd={handleAddTenant}
      />

      <EditTenantDialog
        open={!!editTenantId}
        onClose={() => setEditTenantId(null)}
        tenant={state.tenants.find(t => t.id === editTenantId) || null}
        onSave={handleEditTenant}
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
        onSave={handleUpdateSettings}
      />

      <DuesDialog
        open={duesOpen}
        onClose={() => setDuesOpen(false)}
        tenants={state.tenants}
      />

      <RevenueDialog
        open={revenueOpen}
        onClose={() => setRevenueOpen(false)}
        tenants={state.tenants}
      />
    </div>
  );
};

export default Index;
