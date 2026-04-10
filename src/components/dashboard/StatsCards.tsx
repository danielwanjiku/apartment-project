import { DollarSign, TrendingUp, AlertTriangle, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tenant, FloorConfig, getAllUnits, getTotalArrears } from '@/lib/types';

interface StatsCardsProps {
  tenants: Tenant[];
  floors: FloorConfig[];
}

const StatsCards = ({ tenants, floors }: StatsCardsProps) => {
  const allUnits = getAllUnits(floors);
  const vacantCount = allUnits.length - tenants.length;
  const expectedRent = tenants.reduce((sum, t) => sum + t.monthlyRent, 0);
  const totalDues = tenants.reduce((sum, t) => sum + getTotalArrears(t), 0);

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const collected = tenants.reduce((sum, t) => sum + (t.payments[currentKey] || 0), 0);

  const stats = [
    { label: 'Expected', value: `₹${expectedRent.toLocaleString()}`, icon: DollarSign, color: 'text-foreground' },
    { label: 'Collected', value: `₹${collected.toLocaleString()}`, icon: TrendingUp, color: 'text-primary' },
    { label: 'Total Dues', value: `₹${totalDues.toLocaleString()}`, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Vacant', value: vacantCount.toString(), icon: Home, color: 'text-muted-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <stat.icon className="w-4 h-4" />
              <span>{stat.label}</span>
            </div>
            <p className={`font-heading text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
