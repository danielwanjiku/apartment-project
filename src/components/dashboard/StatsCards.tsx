import { DollarSign, TrendingUp, AlertTriangle, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tenant, FloorConfig, getAllUnits, getMonthDues, getEffectiveCollectedForMonth } from '@/lib/types';

interface StatsCardsProps {
  tenants: Tenant[];
  floors: FloorConfig[];
  onOpenDues: () => void;
  onOpenRevenue: () => void;
}

const StatsCards = ({ tenants, floors, onOpenDues, onOpenRevenue }: StatsCardsProps) => {
  const allUnits = getAllUnits(floors);
  const vacantCount = allUnits.length - tenants.length;

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthLabel = now.toLocaleString('default', { month: 'short', year: 'numeric' });

  const collected = tenants.reduce((sum, t) =>
    sum + getEffectiveCollectedForMonth(t, currentKey), 0);
  const currentMonthDues = getMonthDues(tenants, currentKey);

  // Expected = current month's total rent across all tenants
  const expectedThisMonth = tenants.reduce((sum, t) => sum + t.monthlyRent, 0);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm mb-1">
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Expected ({currentMonthLabel})</span>
          </div>
          <p className="font-heading text-xl sm:text-2xl font-bold text-foreground">KSh {expectedThisMonth.toLocaleString()}</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm cursor-pointer hover:border-primary transition-colors" onClick={onOpenRevenue}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm mb-1">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Collected ({currentMonthLabel})</span>
          </div>
          <p className="font-heading text-xl sm:text-2xl font-bold text-primary">KSh {collected.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Click to view by period</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm cursor-pointer hover:border-destructive transition-colors" onClick={onOpenDues}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm mb-1">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Dues ({currentMonthLabel})</span>
          </div>
          <p className="font-heading text-xl sm:text-2xl font-bold text-destructive">KSh {currentMonthDues.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Click to view by period</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm mb-1">
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Vacant Units</span>
          </div>
          <p className="font-heading text-xl sm:text-2xl font-bold text-muted-foreground">{vacantCount}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
