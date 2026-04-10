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
  onPay: (tenantId: string, month: string, amount: number) => void;
}

const PaymentDialog = ({ open, onClose, tenant, month, onPay }: PaymentDialogProps) => {
  const [amount, setAmount] = useState('');

  if (!tenant) return null;

  const totalDue = getTotalArrears(tenant);
  const alreadyPaid = tenant.payments[month] || 0;

  const handleSubmit = () => {
    const val = Number(amount);
    if (val <= 0) return;
    onPay(tenant.id, month, val);
    setAmount('');
    onClose();
  };

  const formatMonth = (key: string) => {
    const [y, m] = key.split('-');
    const date = new Date(Number(y), Number(m) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setAmount(''); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Tenant:</span> {tenant.name} ({tenant.unitId})</p>
            <p><span className="text-muted-foreground">Month:</span> {formatMonth(month)}</p>
            <p><span className="text-muted-foreground">Set Rent:</span> ₹{tenant.monthlyRent.toLocaleString()}</p>
            {totalDue > 0 && (
              <p className="text-destructive font-medium">Total Outstanding: ₹{totalDue.toLocaleString()}</p>
            )}
            {alreadyPaid > 0 && (
              <p><span className="text-muted-foreground">Already paid this month:</span> ₹{alreadyPaid.toLocaleString()}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Payment Amount (₹)</Label>
            <Input
              type="number"
              placeholder={tenant.monthlyRent.toString()}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            {Number(amount) > tenant.monthlyRent && (
              <p className="text-xs text-primary">
                ₹{(Number(amount) - tenant.monthlyRent).toLocaleString()} will carry forward to next month
              </p>
            )}
            {Number(amount) > 0 && Number(amount) < tenant.monthlyRent && (
              <p className="text-xs text-destructive">
                ₹{(tenant.monthlyRent - Number(amount)).toLocaleString()} short of the set rent
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setAmount(''); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!amount || Number(amount) <= 0}>Record Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
