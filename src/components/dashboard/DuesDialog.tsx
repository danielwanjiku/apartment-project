import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Calendar } from 'lucide-react';
import { Tenant, getRangeDues } from '@/lib/types';

interface DuesDialogProps {
  open: boolean;
  onClose: () => void;
  tenants: Tenant[];
}

type Preset = 'this-month' | 'last-3-months' | 'last-6-months' | 'custom';

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const getMonthsBetween = (from: string, to: string): string[] => {
  if (!from || !to) return [];
  const start = new Date(from);
  const end = new Date(to);
  const months: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    months.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
};

const formatMonth = (key: string) => {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
};

const DuesDialog = ({ open, onClose, tenants }: DuesDialogProps) => {
  const now = new Date();
  const [preset, setPreset] = useState<Preset>('this-month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const months = useMemo(() => {
    if (preset === 'this-month') return [monthKey(now)];
    if (preset === 'last-3-months') {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return getMonthsBetween(from.toISOString().slice(0, 10), now.toISOString().slice(0, 10));
    }
    if (preset === 'last-6-months') {
      const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return getMonthsBetween(from.toISOString().slice(0, 10), now.toISOString().slice(0, 10));
    }
    return getMonthsBetween(customFrom, customTo);
  }, [preset, customFrom, customTo]);

  const breakdown = useMemo(() => getRangeDues(tenants, months), [tenants, months]);
  const totalDues = breakdown.reduce((s, r) => s + r.dues, 0);

  const presets: { label: string; value: Preset }[] = [
    { label: 'This Month', value: 'this-month' },
    { label: 'Last 3 Months', value: 'last-3-months' },
    { label: 'Last 6 Months', value: 'last-6-months' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <AlertTriangle className="w-5 h-5 text-destructive" /> Dues Report
          </DialogTitle>
        </DialogHeader>

        {/* Presets */}
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

        {/* Custom range */}
        {preset === 'custom' && (
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </div>
          </div>
        )}

        {/* Total */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Outstanding Dues</p>
          <p className="font-heading font-bold text-2xl text-destructive">
            KSh {totalDues.toLocaleString()}
          </p>
        </div>

        {/* Month breakdown */}
        {breakdown.length > 0 && breakdown.length > 1 && (
          <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2 pl-3 font-medium text-muted-foreground">Month</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Expected</th>
                  <th className="text-right p-2 pr-3 font-medium text-muted-foreground">Dues</th>
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
                    <td className={`p-2 pr-3 text-right font-medium ${row.dues > 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {row.dues > 0 ? `KSh ${row.dues.toLocaleString()}` : '✓ Cleared'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {breakdown.length === 0 && preset === 'custom' && (
          <p className="text-center text-sm text-muted-foreground py-4">Select a date range to view dues.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DuesDialog;
