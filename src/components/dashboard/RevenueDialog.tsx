import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Calendar } from 'lucide-react';
import { Tenant, getEffectiveCollectedForMonth } from '@/lib/types';

interface RevenueDialogProps {
  open: boolean;
  onClose: () => void;
  tenants: Tenant[];
}

type Preset = 'this-month' | 'last-month' | 'last-6-months' | 'last-year' | 'custom';

// Timezone-safe helpers — work with year/month numbers, no toISOString()
const mk = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;

const getMonthKeys = (fromYear: number, fromMonth: number, toYear: number, toMonth: number): string[] => {
  const months: string[] = [];
  let y = fromYear, m = fromMonth;
  while (y < toYear || (y === toYear && m <= toMonth)) {
    months.push(mk(y, m));
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return months;
};

const getPresetMonths = (preset: Preset, customFrom: string, customTo: string): string[] => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();

  if (preset === 'this-month') return [mk(y, m)];
  if (preset === 'last-month') {
    const pm = m === 0 ? 11 : m - 1;
    const py = m === 0 ? y - 1 : y;
    return [mk(py, pm)];
  }
  if (preset === 'last-6-months') {
    const start = new Date(y, m - 5, 1);
    return getMonthKeys(start.getFullYear(), start.getMonth(), y, m);
  }
  if (preset === 'last-year') return getMonthKeys(y - 1, 0, y - 1, 11);
  if (preset === 'custom' && customFrom && customTo) {
    const [fy, fm] = customFrom.split('-').map(Number);
    const [ty, tm] = customTo.split('-').map(Number);
    return getMonthKeys(fy, fm - 1, ty, tm - 1);
  }
  return [];
};

const formatMonth = (key: string) => {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
};

const RevenueDialog = ({ open, onClose, tenants }: RevenueDialogProps) => {
  const [preset, setPreset] = useState<Preset>('this-month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const months = useMemo(() => getPresetMonths(preset, customFrom, customTo), [preset, customFrom, customTo]);

  const breakdown = useMemo(() => {
    return months.map(month => {
      const expected = tenants.reduce((sum, t) => sum + t.monthlyRent, 0);
      const collected = tenants.reduce((sum, t) =>
        sum + getEffectiveCollectedForMonth(t, month), 0);
      return { month, collected, expected };
    });
  }, [months, tenants]);

  const totalCollected = breakdown.reduce((s, m) => s + m.collected, 0);
  const totalExpected = breakdown.reduce((s, m) => s + m.expected, 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const presets: { label: string; value: Preset }[] = [
    { label: 'This Month', value: 'this-month' },
    { label: 'Last Month', value: 'last-month' },
    { label: 'Last 6 Months', value: 'last-6-months' },
    { label: 'Last Year', value: 'last-year' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <TrendingUp className="w-5 h-5 text-primary" /> Revenue Report
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <Button
              key={p.value}
              size="sm"
              variant={preset === p.value ? 'default' : 'outline'}
              onClick={() => setPreset(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">From (YYYY-MM)</Label>
              <Input placeholder="2026-01" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">To (YYYY-MM)</Label>
              <Input placeholder="2026-04" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Collected</p>
            <p className="font-heading font-bold text-lg text-primary">KSh {totalCollected.toLocaleString()}</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Expected</p>
            <p className="font-heading font-bold text-lg">KSh {totalExpected.toLocaleString()}</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Rate</p>
            <p className={`font-heading font-bold text-lg ${collectionRate >= 80 ? 'text-green-600' : 'text-destructive'}`}>
              {collectionRate}%
            </p>
          </div>
        </div>

        {breakdown.length > 1 && (
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2 pl-3 font-medium text-muted-foreground">Month</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Expected</th>
                  <th className="text-right p-2 pr-3 font-medium text-muted-foreground">Collected</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row, i) => (
                  <tr key={row.month} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                    <td className="p-2 pl-3 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      {formatMonth(row.month)}
                    </td>
                    <td className="p-2 text-right text-muted-foreground">KSh {row.expected.toLocaleString()}</td>
                    <td className={`p-2 pr-3 text-right font-medium ${row.collected >= row.expected ? 'text-green-600' : row.collected > 0 ? 'text-yellow-600' : 'text-destructive'}`}>
                      KSh {row.collected.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {breakdown.length === 0 && preset === 'custom' && (
          <p className="text-center text-sm text-muted-foreground py-4">Enter YYYY-MM format e.g. 2026-01</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RevenueDialog;
