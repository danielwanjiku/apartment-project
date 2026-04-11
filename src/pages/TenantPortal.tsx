import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Home, CreditCard, CheckCircle2, AlertCircle, History, Search, ArrowLeft, Loader2, ArrowRight, Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FloorConfig, getPaymentBreakdown, getTotalArrears, Tenant, shouldShowReminder, distributePayment } from '@/lib/types';
import PaymentHistory from '@/components/dashboard/PaymentHistory';
import { toast } from 'sonner';

interface ApartmentResult { id: string; name: string; floors: FloorConfig[]; }
interface DbTenant {
  id: string; unit_id: string; name: string; id_number: string;
  contact: string; monthly_rent: number; security_deposit: number; move_in_date: string;
}
type Step = 'search' | 'verify' | 'apartment';

const TenantPortal = () => {
  const [step, setStep] = useState<Step>('search');
  const [idInput, setIdInput] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifiedTenantId, setVerifiedTenantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [apartments, setApartments] = useState<ApartmentResult[]>([]);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentResult | null>(null);
  const [tenants, setTenants] = useState<DbTenant[]>([]);
  const [payments, setPayments] = useState<Record<string, Record<string, number>>>({});
  const [loadingApt, setLoadingApt] = useState(false);

  // Payment dialog state
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaStep, setMpesaStep] = useState<'amount' | 'phone' | 'waiting'>('amount');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [successCarry, setSuccessCarry] = useState(0);
  const [successNextDue, setSuccessNextDue] = useState(0);
  const [historyTenantId, setHistoryTenantId] = useState<string | null>(null);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nextMonthLabel = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' });

  // Live search
  useEffect(() => {
    if (!searchQuery.trim()) { setApartments([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase.from('apartments').select('id, name, floors')
          .ilike('name', `${searchQuery}%`).eq('configured', true).limit(8);
        setApartments((data || []).map(a => ({ id: a.id, name: a.name, floors: (a.floors as any) || [] })));
      } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectApartment = async (apt: ApartmentResult) => {
    setSelectedApartment(apt);
    setLoadingApt(true);
    setStep('verify');
    const { data: tenantData } = await supabase.from('tenants').select('*').eq('apartment_id', apt.id);
    const dbTenants = tenantData || [];
    setTenants(dbTenants);
    const payMap: Record<string, Record<string, number>> = {};
    for (const t of dbTenants) {
      const { data: pData } = await supabase.from('payments').select('month, amount')
        .eq('tenant_id', t.id).neq('payment_method', 'deposit');
      const monthMap: Record<string, number> = {};
      for (const p of pData || []) monthMap[p.month] = (monthMap[p.month] || 0) + p.amount;
      payMap[t.id] = monthMap;
    }
    setPayments(payMap);
    setLoadingApt(false);
  };

  const handleVerifyId = () => {
    const matched = tenants.find(t => t.id_number === idInput.trim());
    if (!matched) { setVerifyError('ID number not found. Please check and try again.'); return; }
    setVerifiedTenantId(matched.id);
    setVerifyError('');
    setStep('apartment');
  };

  const toLocalTenant = (t: DbTenant): Tenant => ({
    id: t.id, unitId: t.unit_id, name: t.name, idNumber: t.id_number || '',
    contact: t.contact, monthlyRent: t.monthly_rent, securityDeposit: t.security_deposit,
    moveInDate: t.move_in_date, payments: payments[t.id] || {},
  });

  const handleUnitClick = () => {
    setPaymentAmount('');
    setMpesaPhone('');
    setMpesaStep('amount');
    setPaymentSuccess(false);
    setPaymentError('');
    setPaymentOpen(true);
  };

  // Compute payment dialog values (outside JSX)
  const activeTenant = tenants.find(t => t.id === selectedTenantId || t.id === verifiedTenantId);
  const historyTenant = tenants.find(t => t.id === historyTenantId);
  const lt = activeTenant ? toLocalTenant(activeTenant) : null;
  const totalDue = lt ? getTotalArrears(lt) : 0;
  const paidThisMonth = lt ? (lt.payments[currentMonthKey] || 0) : 0;
  const amount = Number(paymentAmount) || 0;

  const previewPayments = lt ? { ...lt.payments, [currentMonthKey]: (lt.payments[currentMonthKey] || 0) + amount } : {};
  const previewBreakdown = lt ? getPaymentBreakdown({ ...lt, payments: previewPayments }) : [];
  const lastEntry = previewBreakdown[previewBreakdown.length - 1];
  const carryForward = lastEntry && lastEntry.balance > 0 ? lastEntry.balance : 0;
  const nextMonthDue = lt ? Math.max(0, lt.monthlyRent - carryForward) : 0;
  const clearsArrears = totalDue > 0 && amount >= totalDue;

  const handleInitiateSTK = async () => {
    if (!mpesaPhone.trim() || amount <= 0 || !activeTenant) return;
    setPaymentError('');
    setMpesaStep('waiting');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initiate-mpesa-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          tenantId: activeTenant.id,
          unitId: activeTenant.unit_id,
          apartmentName: selectedApartment?.name || '',
          amount,
          phone: mpesaPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.error) { setPaymentError(data.error); setMpesaStep('phone'); return; }

      // Poll for confirmation every 3 seconds
      const poll = setInterval(async () => {
        const { data: tx } = await supabase.from('mpesa_transactions')
          .select('status').eq('id', data.transactionId).single();
        if (tx?.status === 'success') {
          clearInterval(poll);
          if (lt) {
            const dist = distributePayment(lt, amount);
            setPayments(prev => {
              const updated = { ...(prev[activeTenant.id] || {}) };
              for (const [m, amt] of Object.entries(dist)) updated[m] = (updated[m] || 0) + amt;
              return { ...prev, [activeTenant.id]: updated };
            });
          }
          setSuccessCarry(carryForward);
          setSuccessNextDue(nextMonthDue);
          setPaymentSuccess(true);
        } else if (tx?.status === 'failed') {
          clearInterval(poll);
          setPaymentError('Payment was cancelled or failed. Please try again.');
          setMpesaStep('phone');
        }
      }, 3000);
      setTimeout(() => clearInterval(poll), 120000);
    } catch {
      setPaymentError('Could not connect. Please try again.');
      setMpesaStep('phone');
    }
  };

  const resetPaymentDialog = () => {
    setPaymentOpen(false); setPaymentSuccess(false);
    setMpesaStep('amount'); setPaymentAmount('');
    setMpesaPhone(''); setPaymentError('');
  };

  const reminder = shouldShowReminder(selectedApartment?.name || 'your apartment');

  return (
    <div className="min-h-screen bg-background">
      {reminder.show && (
        <div className="bg-destructive text-destructive-foreground text-center text-sm py-2.5 px-4 font-medium sticky top-0 z-50 flex items-center justify-center gap-2">
          <Bell className="w-4 h-4 shrink-0" />{reminder.message}
        </div>
      )}

      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Building2 className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h1 className="font-heading font-bold text-lg">
              {step === 'apartment' && selectedApartment ? selectedApartment.name : 'Tenant Portal'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {step === 'apartment' ? 'Your unit' : step === 'verify' ? 'Verify your identity' : 'Find your apartment'}
            </p>
          </div>
          {(step === 'apartment' || step === 'verify') && (
            <button onClick={() => { setStep('search'); setSelectedApartment(null); setSearchQuery(''); setIdInput(''); setVerifyError(''); setVerifiedTenantId(null); }}
              className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Search */}
        {step === 'search' && (
          <div className="max-w-md mx-auto space-y-4 pt-8">
            <div className="text-center space-y-2 mb-6">
              <Building2 className="w-12 h-12 mx-auto text-primary" />
              <h2 className="font-heading text-2xl font-bold">Find Your Apartment</h2>
              <p className="text-sm text-muted-foreground">Type your apartment name to get started</p>
            </div>
            <div className="relative">
              <Input placeholder="Type apartment name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus className="pr-10" />
              {searching ? <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />
                : <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />}
            </div>
            {apartments.length > 0 && (
              <div className="space-y-2">
                {apartments.map(apt => (
                  <button key={apt.id} onClick={() => handleSelectApartment(apt)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left">
                    <Building2 className="w-5 h-5 text-primary shrink-0" />
                    <div><p className="font-medium">{apt.name}</p><p className="text-xs text-muted-foreground">{apt.floors.length} floor{apt.floors.length !== 1 ? 's' : ''}</p></div>
                    <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
            {apartments.length === 0 && searchQuery && !searching && (
              <p className="text-center text-sm text-muted-foreground py-4">No apartments found.</p>
            )}
          </div>
        )}

        {/* Verify ID */}
        {step === 'verify' && (
          <div className="max-w-md mx-auto space-y-4 pt-8">
            <div className="text-center space-y-2 mb-6">
              <Building2 className="w-12 h-12 mx-auto text-primary" />
              <h2 className="font-heading text-2xl font-bold">{selectedApartment?.name}</h2>
              <p className="text-sm text-muted-foreground">Enter your National ID number to access your unit</p>
            </div>
            {loadingApt ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-3">
                <Input placeholder="e.g. 12345678" value={idInput}
                  onChange={e => { setIdInput(e.target.value); setVerifyError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyId()}
                  autoFocus className={verifyError ? 'border-destructive' : ''} />
                {verifyError && <p className="text-sm text-destructive">{verifyError}</p>}
                <Button className="w-full" onClick={handleVerifyId} disabled={!idInput.trim()}>
                  Verify & Open My Unit
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Unit card */}
        {step === 'apartment' && selectedApartment && verifiedTenantId && (() => {
          const verifiedTenant = tenants.find(t => t.id === verifiedTenantId);
          if (!verifiedTenant) return null;
          const vlt = toLocalTenant(verifiedTenant);
          const vDue = getTotalArrears(vlt);
          const vPaid = vDue === 0;
          const dayNow = new Date().getDate();
          return (
            <div className="max-w-sm mx-auto pt-6 space-y-4">
              <p className="text-center text-sm text-muted-foreground">Welcome, <strong>{verifiedTenant.name}</strong></p>
              {reminder.show && !vPaid && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive font-medium text-center">
                  ⚠️ Rent due in {10 - dayNow} day{10 - dayNow !== 1 ? 's' : ''}! KSh {vDue.toLocaleString()} outstanding.
                </div>
              )}
              {reminder.show && vPaid && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive font-medium text-center">
                  🔔 Rent due in {10 - dayNow} day{10 - dayNow !== 1 ? 's' : ''}!
                </div>
              )}
              <Card onClick={() => { setSelectedTenantId(verifiedTenant.id); handleUnitClick(); }}
                className={`cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${vPaid
                  ? 'bg-[hsl(var(--tenant-paid))] border-[hsl(var(--tenant-paid-border))]'
                  : 'bg-[hsl(var(--tenant-due))] border-[hsl(var(--tenant-due-border))]'}`}>
                <CardContent className="p-6 text-center space-y-3">
                  <Home className="w-12 h-12 mx-auto text-foreground" />
                  <p className="font-heading font-bold text-3xl">{verifiedTenant.unit_id}</p>
                  <p className="text-sm text-muted-foreground">{selectedApartment.name}</p>
                  {vPaid ? (
                    <Badge variant="secondary" className="bg-[hsl(var(--tenant-paid-border))] text-tenant-paid-text gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-[hsl(var(--tenant-due-border))] text-tenant-due-text gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> KSh {vDue.toLocaleString()} due
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground">Tap to make a payment</p>
                </CardContent>
              </Card>
              <Button variant="outline" className="w-full gap-2"
                onClick={() => setHistoryTenantId(verifiedTenant.id)}>
                <History className="w-4 h-4" /> View Payment History
              </Button>
            </div>
          );
        })()}
      </main>

      {/* M-Pesa Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={o => { if (!o) resetPaymentDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              {paymentSuccess ? 'Payment Confirmed!' : 'Pay via M-Pesa'}
            </DialogTitle>
          </DialogHeader>

          {paymentSuccess ? (
            <div className="text-center py-4 space-y-4">
              <CheckCircle2 className="w-16 h-16 mx-auto text-primary" />
              <p className="font-heading font-semibold text-lg">Payment Successful!</p>
              <p className="text-sm text-muted-foreground">Your M-Pesa payment has been confirmed.</p>
              {(() => {
                // Calculate remaining arrears + next month rent after this payment
                const remainingArrears = Math.max(0, totalDue - amount);
                const nextPayment = remainingArrears + (lt?.monthlyRent || 0) - successCarry;
                const nextPaymentDue = Math.max(0, nextPayment);
                return (
                  <div className="bg-muted rounded-lg p-4 text-sm text-left space-y-2">
                    {remainingArrears > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Remaining arrears</span>
                        <span className="font-semibold">KSh {remainingArrears.toLocaleString()}</span>
                      </div>
                    )}
                    {successCarry > 0 && (
                      <div className="flex justify-between text-primary">
                        <span>Credit carried forward</span>
                        <span className="font-semibold">- KSh {successCarry.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next month's rent</span>
                      <span>KSh {lt?.monthlyRent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold text-base">
                      <span>Pay in {nextMonthLabel}</span>
                      <span className={nextPaymentDue > (lt?.monthlyRent || 0) ? 'text-destructive' : 'text-foreground'}>
                        KSh {nextPaymentDue.toLocaleString()}
                      </span>
                    </div>
                    {nextPaymentDue > (lt?.monthlyRent || 0) && (
                      <p className="text-xs text-destructive">Includes KSh {remainingArrears.toLocaleString()} in outstanding arrears</p>
                    )}
                    {nextPaymentDue === 0 && (
                      <p className="text-xs text-primary font-medium">🎉 Next month is already covered!</p>
                    )}
                  </div>
                );
              })()}
              <Button onClick={resetPaymentDialog} className="w-full">Done</Button>
            </div>

          ) : mpesaStep === 'amount' ? (
            <>
              <div className="space-y-4">
                {activeTenant && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Unit</span><span className="font-semibold">{activeTenant.unit_id}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Apartment</span><span className="font-semibold">{selectedApartment?.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Monthly Rent</span><span className="font-semibold">KSh {activeTenant.monthly_rent.toLocaleString()}</span></div>
                    {paidThisMonth > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Paid this month</span><span className="font-semibold text-primary">KSh {paidThisMonth.toLocaleString()}</span></div>}
                    {totalDue > 0 && <div className="flex justify-between border-t pt-2"><span className="text-destructive font-medium">Outstanding</span><span className="text-destructive font-bold">KSh {totalDue.toLocaleString()}</span></div>}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Amount (KSh)</Label>
                  <Input type="number" placeholder={totalDue > 0 ? totalDue.toString() : activeTenant?.monthly_rent.toString()} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} autoFocus className="text-lg" />
                </div>
                {amount > 0 && clearsArrears && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-xs font-medium text-green-700 dark:text-green-400">
                    ✓ This payment clears all outstanding arrears
                  </div>
                )}
                {amount > 0 && carryForward > 0 && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs space-y-1">
                    <p className="font-semibold text-primary">💰 KSh {carryForward.toLocaleString()} will carry forward</p>
                    <p className="text-muted-foreground">You'll only owe <strong className="text-foreground">KSh {nextMonthDue.toLocaleString()}</strong> in {nextMonthLabel}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={resetPaymentDialog}>Cancel</Button>
                <Button onClick={() => setMpesaStep('phone')} disabled={amount <= 0}>
                  Next → Enter M-Pesa Number
                </Button>
              </DialogFooter>
            </>

          ) : mpesaStep === 'phone' ? (
            <>
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3 text-sm flex justify-between">
                  <span className="text-muted-foreground">Amount to pay</span>
                  <span className="font-bold">KSh {amount.toLocaleString()}</span>
                </div>
                <div className="space-y-2">
                  <Label>M-Pesa Phone Number</Label>
                  <Input placeholder="07XXXXXXXX or +254XXXXXXXXX" value={mpesaPhone}
                    onChange={e => { setMpesaPhone(e.target.value); setPaymentError(''); }} autoFocus />
                  <p className="text-xs text-muted-foreground">
                    An STK push will be sent to this number. The prompt will show:<br />
                    <strong>Unit {activeTenant?.unit_id} — {selectedApartment?.name}</strong>
                  </p>
                </div>
                {paymentError && <p className="text-sm text-destructive">{paymentError}</p>}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setMpesaStep('amount')}>Back</Button>
                <Button onClick={handleInitiateSTK} disabled={!mpesaPhone.trim()} className="gap-2">
                  <CreditCard className="w-4 h-4" /> Send STK Push
                </Button>
              </DialogFooter>
            </>

          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="font-heading font-semibold">Waiting for M-Pesa...</p>
              <p className="text-sm text-muted-foreground">
                Check your phone <strong>{mpesaPhone}</strong> and enter your M-Pesa PIN to confirm <strong>KSh {amount.toLocaleString()}</strong>.
              </p>
              <p className="text-xs text-muted-foreground">The prompt will expire in 60 seconds.</p>
              <div className="pt-2 space-y-2">
                <p className="text-xs text-muted-foreground">Already entered your PIN?</p>
                <Button variant="outline" size="sm" onClick={async () => {
                  // Manually record payment if STK callback didn't fire
                  if (!activeTenant || !lt) return;
                  const dist = distributePayment(lt, amount);
                  for (const [m, amt] of Object.entries(dist)) {
                    await supabase.from('payments').insert({ tenant_id: activeTenant.id, month: m, amount: amt, payment_method: 'mpesa' });
                  }
                  setPayments(prev => {
                    const updated = { ...(prev[activeTenant.id] || {}) };
                    for (const [m, amt] of Object.entries(dist)) updated[m] = (updated[m] || 0) + amt;
                    return { ...prev, [activeTenant.id]: updated };
                  });
                  setSuccessCarry(carryForward);
                  setSuccessNextDue(nextMonthDue);
                  setPaymentSuccess(true);
                  toast.success('Payment recorded!');
                }}>
                  ✓ I've entered my PIN — confirm payment
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setMpesaStep('phone')}>
                  Cancel & try again
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      {historyTenant && (
        <Dialog open={!!historyTenantId} onOpenChange={o => { if (!o) setHistoryTenantId(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Payment History — {historyTenant.name} ({historyTenant.unit_id})</DialogTitle>
            </DialogHeader>
            <PaymentHistory tenant={toLocalTenant(historyTenant)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TenantPortal;
