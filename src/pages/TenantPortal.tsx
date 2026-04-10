import { useState } from 'react';
import { useApartmentData } from '@/hooks/useApartmentData';
import { useAuth } from '@/hooks/useAuth';
import { Building2, Home, CreditCard, CheckCircle2, AlertCircle, LogOut, History } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FloorConfig, getUnitId, getFloorLabel, getPaymentBreakdown, getTotalArrears, Tenant, MonthPaymentStatus } from '@/lib/types';
import PaymentHistory from '@/components/dashboard/PaymentHistory';

const TenantPortal = () => {
  const { apartment, tenants, loading, recordPayment, getPaymentsForTenant } = useApartmentData();
  const { signOut, user } = useAuth();
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [historyTenant, setHistoryTenant] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Building2 className="w-12 h-12 mx-auto text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading apartment...</p>
        </div>
      </div>
    );
  }

  if (!apartment || !apartment.configured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Building2 className="w-16 h-16 mx-auto text-muted-foreground" />
            <h1 className="font-heading text-2xl font-bold">No Apartment Found</h1>
            <p className="text-muted-foreground">The apartment hasn't been set up yet. Please ask your landlord to configure the property first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const floors = apartment.floors as FloorConfig[];

  const handleUnitClick = (unitId: string) => {
    const tenant = tenants.find(t => t.unit_id === unitId);
    if (tenant) {
      setSelectedTenant(tenant.id);
      setPaymentOpen(true);
      setPaymentAmount('');
      setPaymentSuccess(false);
    }
  };

  const activeTenant = tenants.find(t => t.id === selectedTenant);
  const historyDbTenant = tenants.find(t => t.id === historyTenant);

  const getLocalTenant = (dbTenant: typeof tenants[0]): Tenant => ({
    id: dbTenant.id,
    unitId: dbTenant.unit_id,
    name: dbTenant.name,
    contact: dbTenant.contact,
    monthlyRent: dbTenant.monthly_rent,
    securityDeposit: dbTenant.security_deposit,
    moveInDate: dbTenant.move_in_date,
    payments: getPaymentsForTenant(dbTenant.id),
  });

  const handlePay = async () => {
    if (!activeTenant || !paymentAmount) return;
    const amount = Number(paymentAmount);
    if (amount <= 0) return;

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await recordPayment(activeTenant.id, month, amount, 'mpesa');
    setPaymentSuccess(true);
    setPaymentAmount('');
  };

  const currentMonthKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-7 h-7 text-primary" />
            <div>
              <h1 className="font-heading font-bold text-lg">{apartment.name}</h1>
              <p className="text-xs text-muted-foreground">Tenant Payment Portal</p>
            </div>
          </div>
          {user && (
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="font-heading text-xl font-semibold">Select Your Unit</h2>
          <p className="text-sm text-muted-foreground">Tap on your unit to make a payment</p>
        </div>

        {floors.map((floor) => {
          const units: string[] = [];
          for (let i = 0; i < floor.unitCount; i++) {
            units.push(getUnitId(floor.floorIndex, i));
          }

          return (
            <div key={floor.floorIndex} className="space-y-3">
              <h3 className="font-heading font-semibold text-base">{getFloorLabel(floor.floorIndex)}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {units.map((unitId) => {
                  const tenant = tenants.find(t => t.unit_id === unitId);
                  const isOccupied = !!tenant;
                  let isPaid = false;
                  let totalDue = 0;

                  if (tenant) {
                    const localTenant = getLocalTenant(tenant);
                    totalDue = getTotalArrears(localTenant);
                    isPaid = totalDue === 0;
                  }

                  return (
                    <Card
                      key={unitId}
                      className={`cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                        !isOccupied
                          ? 'opacity-50 cursor-not-allowed border-dashed'
                          : isPaid
                          ? 'bg-[hsl(142,45%,90%)] border-[hsl(142,45%,75%)] hover:border-primary'
                          : 'bg-tenant-due border-tenant-due-border hover:border-destructive'
                      }`}
                      onClick={() => isOccupied && handleUnitClick(unitId)}
                    >
                      <CardContent className="p-4 text-center space-y-2">
                        <Home className={`w-8 h-8 mx-auto ${isOccupied ? 'text-foreground' : 'text-muted-foreground'}`} />
                        <p className="font-heading font-bold text-lg">{unitId}</p>
                        {isOccupied ? (
                          <>
                            <p className="text-xs text-muted-foreground truncate">{tenant!.name}</p>
                            {isPaid ? (
                              <Badge variant="secondary" className="bg-[hsl(142,45%,75%)] text-tenant-paid-text text-xs gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Paid
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-tenant-due-border text-tenant-due-text text-xs gap-1">
                                <AlertCircle className="w-3 h-3" /> ₹{totalDue.toLocaleString()} due
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2"
                              onClick={(e) => { e.stopPropagation(); setHistoryTenant(tenant!.id); }}
                            >
                              <History className="w-3 h-3 mr-1" /> History
                            </Button>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Vacant</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>

      {/* Payment Dialog */}
      {activeTenant && (() => {
        const localTenant = getLocalTenant(activeTenant);
        const totalDue = getTotalArrears(localTenant);
        const breakdown = getPaymentBreakdown(localTenant);
        const currentStatus = breakdown.find(m => m.month === currentMonthKey);
        const alreadyPaidThisMonth = localTenant.payments[currentMonthKey] || 0;

        return (
          <Dialog open={paymentOpen} onOpenChange={(o) => { if (!o) { setPaymentOpen(false); setPaymentSuccess(false); } }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  {paymentSuccess ? 'Payment Recorded!' : 'Make Payment'}
                </DialogTitle>
              </DialogHeader>

              {paymentSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-primary" />
                  <p className="font-heading font-semibold text-lg">Payment Successful!</p>
                  <p className="text-sm text-muted-foreground">
                    Your payment has been recorded and your landlord will be notified.
                  </p>
                  <Button onClick={() => { setPaymentOpen(false); setPaymentSuccess(false); }} className="w-full">
                    Done
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Unit</span>
                        <span className="font-semibold">{activeTenant.unit_id}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tenant</span>
                        <span className="font-semibold">{activeTenant.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monthly Rent</span>
                        <span className="font-semibold">₹{activeTenant.monthly_rent.toLocaleString()}</span>
                      </div>
                      {alreadyPaidThisMonth > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Paid this month</span>
                          <span className="font-semibold text-primary">₹{alreadyPaidThisMonth.toLocaleString()}</span>
                        </div>
                      )}
                      {totalDue > 0 && (
                        <div className="flex justify-between text-sm border-t pt-2">
                          <span className="text-destructive font-medium">Total Outstanding</span>
                          <span className="text-destructive font-bold">₹{totalDue.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Amount (₹)</Label>
                      <Input
                        type="number"
                        placeholder={activeTenant.monthly_rent.toString()}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        autoFocus
                        className="text-lg"
                      />
                    </div>
                  </div>

                  <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setPaymentOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                    <Button onClick={handlePay} disabled={!paymentAmount || Number(paymentAmount) <= 0} className="w-full sm:w-auto gap-2">
                      <CreditCard className="w-4 h-4" /> Pay ₹{paymentAmount ? Number(paymentAmount).toLocaleString() : '0'}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Payment History Dialog */}
      {historyDbTenant && (
        <Dialog open={!!historyTenant} onOpenChange={(o) => { if (!o) setHistoryTenant(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">
                Payment History — {historyDbTenant.name} ({historyDbTenant.unit_id})
              </DialogTitle>
            </DialogHeader>
            <PaymentHistory tenant={getLocalTenant(historyDbTenant)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TenantPortal;
