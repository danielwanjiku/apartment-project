import { Tenant, getPaymentBreakdown, MonthPaymentStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, History } from 'lucide-react';

interface PaymentHistoryProps {
  tenant: Tenant;
}

const formatMonth = (key: string) => {
  const [y, m] = key.split('-');
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

const PaymentHistory = ({ tenant }: PaymentHistoryProps) => {
  const breakdown = getPaymentBreakdown(tenant);

  if (breakdown.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        No payment history yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="font-heading font-semibold text-sm flex items-center gap-2">
        <History className="w-4 h-4" /> Payment History
      </h4>
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {[...breakdown].reverse().map((m: MonthPaymentStatus) => {
          const paid = m.paid + m.carryIn;
          const isPaid = m.balance >= 0;

          return (
            <div
              key={m.month}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                isPaid ? 'bg-tenant-paid' : 'bg-tenant-due'
              }`}
            >
              <span className="font-medium">{formatMonth(m.month)}</span>
              <div className="flex items-center gap-2">
                <span>KSh {m.paid.toLocaleString()} / KSh {m.due.toLocaleString()}</span>
                {isPaid ? (
                  <Badge variant="secondary" className="bg-tenant-paid-border text-tenant-paid-text text-[10px] gap-0.5 px-1.5 py-0">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Paid
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-tenant-due-border text-tenant-due-text text-[10px] gap-0.5 px-1.5 py-0">
                    <AlertCircle className="w-2.5 h-2.5" /> KSh {Math.abs(m.balance).toLocaleString()} due
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentHistory;
