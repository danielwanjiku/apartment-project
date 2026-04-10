import { useState } from 'react';
import { User, Phone, Calendar, DollarSign, Shield, Trash2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tenant, getTenureString, getArrearsMonths, getTotalArrears, getPaymentBreakdown } from '@/lib/types';
import PaymentHistory from './PaymentHistory';

interface TenantCardProps {
  tenant: Tenant;
  onMarkPaid: (tenantId: string, month: string) => void;
  onDelete: (tenantId: string) => void;
}

const TenantCard = ({ tenant, onMarkPaid, onDelete }: TenantCardProps) => {
  const [showHistory, setShowHistory] = useState(false);
  const arrears = getArrearsMonths(tenant);
  const isPaid = arrears.length === 0;
  const tenure = getTenureString(tenant.moveInDate);
  const totalDue = getTotalArrears(tenant);
  const breakdown = getPaymentBreakdown(tenant);

  const currentMonthKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  const currentMonthStatus = breakdown.find((m) => m.month === currentMonthKey);
  const hasCarryForward = currentMonthStatus && currentMonthStatus.carryIn > 0;

  return (
    <Card
      className={`transition-all duration-300 hover:shadow-md ${
        isPaid
          ? 'bg-[hsl(142,45%,90%)] border-[hsl(142,45%,75%)]'
          : 'bg-tenant-due border-tenant-due-border'
      }`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isPaid ? 'bg-[hsl(142,45%,75%)]' : 'bg-tenant-due-border'}`}>
              <span className="font-heading font-bold text-sm">{tenant.unitId}</span>
            </div>
            <div>
              <h3 className="font-heading font-semibold text-sm leading-tight">{tenant.name}</h3>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span className="text-xs">{tenant.contact}</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(tenant.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
            <span>₹{tenant.monthlyRent.toLocaleString()}/mo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <span>₹{tenant.securityDeposit.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Occupied for {tenure}</span>
          </div>
        </div>

        {hasCarryForward && (
          <div className="text-xs bg-primary/10 text-primary rounded-md px-2 py-1">
            💰 ₹{currentMonthStatus.carryIn.toLocaleString()} credit from overpayment — only ₹{Math.max(0, tenant.monthlyRent - currentMonthStatus.carryIn).toLocaleString()} due this month
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          {isPaid ? (
            <Badge variant="secondary" className="bg-[hsl(142,45%,75%)] text-tenant-paid-text text-xs gap-1">
              <CheckCircle2 className="w-3 h-3" /> Fully Paid
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-tenant-due-border text-tenant-due-text text-xs gap-1">
              <AlertCircle className="w-3 h-3" /> Arrears: ₹{totalDue.toLocaleString()}
            </Badge>
          )}

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              History
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onMarkPaid(tenant.id, currentMonthKey)}
            >
              Pay Rent
            </Button>
          </div>
        </div>

        {showHistory && (
          <div className="pt-2 border-t border-border/50">
            <PaymentHistory tenant={tenant} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TenantCard;
