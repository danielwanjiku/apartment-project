import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tenant, getTotalArrears } from '@/lib/types';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  month: string;
  onPay: (tenantId: string, month: string, amount: number, type: 'rent' | 'deposit') => void;
}

const PaymentDialog = ({ open, onClose, tenant, month, onPay }: PaymentDialogProps) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'rent' | 'deposit'>('rent');

  if (!tenant) return null;

  const totalDue = getTotalArrears(tenant);
  const alreadyPaid = tenant.payments[month] || 0;

  const handleSubmit = () => {
    const val = Number(amount);
    if (val <= 0) return;
    onPay(tenant.id, month, val, type);
    setAmount('');
    setType('rent');
    onClose();
  };

  const formatMonth = (key: string) => {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setAmount(''); setType('rent'); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Tenant:</span> {tenant.name} ({tenant.unitId})</p>
            <p><span className="text-muted-foreground">Month:</span> {formatMonth(month)}</p>
            <p><span className="text-muted-foreground">Monthly Rent:</span> KSh {tenant.monthlyRent.toLocaleString()}</p>
            {totalDue > 0 && <p className="text-destructive font-medium">Outstanding: KSh {totalDue.toLocaleString()}</p>}
            {alreadyPaid > 0 && <p><span className="text-muted-foreground">Paid this month:</span> KSh {alreadyPaid.toLocaleString()}</p>}
          </div>

          {/* Payment type toggle */}
          <div className="space-y-1.5">
            <Label>Payment Type</Label>
            <div className="flex gap-2">
              <Button
                size="sm" variant={type === 'rent' ? 'default' : 'outline'}
                className="flex-1" onClick={() => setType('rent')}
              >
                Rent
              </Button>
              <Button
                size="sm" variant={type === 'deposit' ? 'default' : 'outline'}
                className="flex-1" onClick={() => setType('deposit')}
              >
                Deposit
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Amount (KSh)</Label>
            <Input
              type="number"
              placeholder={type === 'deposit' ? tenant.securityDeposit.toString() : tenant.monthlyRent.toString()}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            {type === 'rent' && Number(amount) > tenant.monthlyRent && (
              <p className="text-xs text-primary">KSh {(Number(amount) - tenant.monthlyRent).toLocaleString()} will carry forward</p>
            )}
            {type === 'rent' && Number(amount) > 0 && Number(amount) < tenant.monthlyRent && (
              <p className="text-xs text-destructive">KSh {(tenant.monthlyRent - Number(amount)).toLocaleString()} short of rent</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setAmount(''); setType('rent'); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!amount || Number(amount) <= 0}>Record Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
