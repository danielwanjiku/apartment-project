export interface Tenant {
  id: string;
  unitId: string;
  name: string;
  idNumber: string;
  contact: string;
  monthlyRent: number;
  securityDeposit: number;
  moveInDate: string; // ISO date string
  payments: Record<string, number>; // "YYYY-MM" -> amount paid that month
}

export interface FloorConfig {
  floorIndex: number; // 0 = ground
  unitCount: number;
}

export interface AppState {
  apartmentName: string;
  floors: FloorConfig[];
  tenants: Tenant[];
  configured: boolean;
}

export const getDefaultState = (): AppState => ({
  apartmentName: '',
  floors: [],
  tenants: [],
  configured: false,
});

export const getUnitId = (floorIndex: number, unitIndex: number): string => {
  if (floorIndex === 0) return `G${unitIndex + 1}`;
  return `${floorIndex}-${unitIndex + 1}`;
};

export const getFloorLabel = (floorIndex: number): string => {
  if (floorIndex === 0) return 'Ground Floor';
  if (floorIndex === 1) return '1st Floor';
  if (floorIndex === 2) return '2nd Floor';
  if (floorIndex === 3) return '3rd Floor';
  return `${floorIndex}th Floor`;
};

export const getAllUnits = (floors: FloorConfig[]): string[] => {
  const units: string[] = [];
  floors.forEach((floor) => {
    for (let i = 0; i < floor.unitCount; i++) {
      units.push(getUnitId(floor.floorIndex, i));
    }
  });
  return units;
};

export const getTenureString = (moveInDate: string): string => {
  const start = new Date(moveInDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) { months = 0; days = 0; }
  return `${months} Month${months !== 1 ? 's' : ''}, ${days} Day${days !== 1 ? 's' : ''}`;
};

/** Get list of due month keys for a tenant (from move-in to now) */
const getDueMonthKeys = (tenant: Tenant): string[] => {
  const start = new Date(tenant.moveInDate);
  const now = new Date();
  const months: string[] = [];

  // Always start from the move-in month — no grace period skip
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    if (key > currentMonthKey) break;
    // Only skip current month if we're before the 10th AND tenant hasn't moved in yet this month
    if (key === currentMonthKey && now.getDate() < 10 && start.getMonth() !== now.getMonth()) break;
    months.push(key);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
};

export interface MonthPaymentStatus {
  month: string;
  due: number;
  paid: number;
  carryIn: number;  // carry-forward from previous months
  balance: number;  // negative = still owed, positive = overpaid (carried forward)
}

/** Calculate payment status for each due month, with carry-forward logic */
export const getPaymentBreakdown = (tenant: Tenant): MonthPaymentStatus[] => {
  const dueMonths = getDueMonthKeys(tenant);
  const result: MonthPaymentStatus[] = [];
  let carry = 0;

  for (const month of dueMonths) {
    const paid = (tenant.payments || {})[month] || 0;
    const effectivePaid = paid + carry;
    const balance = effectivePaid - tenant.monthlyRent;
    result.push({
      month,
      due: tenant.monthlyRent,
      paid,
      carryIn: carry,
      balance,
    });
    carry = balance > 0 ? balance : 0;
  }

  return result;
};

/** Get months with outstanding arrears (after carry-forward) */
export const getArrearsMonths = (tenant: Tenant): string[] => {
  // If the net total is fully paid, no arrears — even if individual months look negative
  if (getTotalArrears(tenant) === 0) return [];
  const breakdown = getPaymentBreakdown(tenant);
  return breakdown.filter((m) => m.balance < 0).map((m) => m.month);
};

/** Get total arrears amount */
export const getTotalArrears = (tenant: Tenant): number => {
  const breakdown = getPaymentBreakdown(tenant);
  // Total arrears = sum of negative balances (last unpaid months)
  // But with carry-forward, we want the net amount owed
  const totalDue = breakdown.length * tenant.monthlyRent;
  const totalPaid = Object.values(tenant.payments || {}).reduce((s, v) => s + v, 0);
  return Math.max(0, totalDue - totalPaid);
};

/** Get the amount due for the current month after carry-forward */
export const getCurrentMonthDue = (tenant: Tenant): number => {
  const breakdown = getPaymentBreakdown(tenant);
  if (breakdown.length === 0) return 0;
  const last = breakdown[breakdown.length - 1];
  // If balance < 0, that's what's still owed for the latest month
  // But really we want total outstanding
  return getTotalArrears(tenant);
};

/** Check if tenant is fully paid (no arrears) */
export const isFullyPaid = (tenant: Tenant): boolean => {
  return getTotalArrears(tenant) === 0;
};

/** Get total dues for a specific month key (YYYY-MM) across all tenants */
export const getMonthDues = (tenants: Tenant[], monthKey: string): number => {
  return tenants.reduce((sum, t) => {
    // If tenant has no net arrears overall, no month shows as due
    if (getTotalArrears(t) === 0) return sum;
    const breakdown = getPaymentBreakdown(t);
    const entry = breakdown.find(m => m.month === monthKey);
    if (!entry) return sum;
    return sum + Math.max(0, -entry.balance);
  }, 0);
};

/** Get total dues for a range of month keys */
export const getRangeDues = (tenants: Tenant[], monthKeys: string[]): { month: string; dues: number; expected: number }[] => {
  return monthKeys.map(month => {
    const expected = tenants.reduce((s, t) => s + t.monthlyRent, 0);
    const dues = tenants.reduce((sum, t) => {
      if (getTotalArrears(t) === 0) return sum;
      const breakdown = getPaymentBreakdown(t);
      const entry = breakdown.find(m => m.month === month);
      if (!entry) return sum;
      return sum + Math.max(0, -entry.balance);
    }, 0);
    return { month, dues, expected };
  });
}; 

/** Distribute a lump sum payment across unpaid months (oldest first).
 *  Returns a map of { month -> amount to add } */
export const distributePayment = (tenant: Tenant, totalAmount: number): Record<string, number> => {
  const breakdown = getPaymentBreakdown(tenant);
  const distribution: Record<string, number> = {};
  let remaining = totalAmount;

  // Fill unpaid months oldest first
  for (const entry of breakdown) {
    if (remaining <= 0) break;
    const owed = Math.max(0, -entry.balance); // how much still owed for this month
    if (owed > 0) {
      const allocate = Math.min(remaining, owed);
      distribution[entry.month] = (distribution[entry.month] || 0) + allocate;
      remaining -= allocate;
    }
  }

  // Any remainder goes to the current month
  if (remaining > 0) {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    distribution[currentKey] = (distribution[currentKey] || 0) + remaining;
  }

  return distribution;
};

/** For revenue reporting: distribute total payments oldest-first to show
 *  how much was effectively collected for each month, regardless of which
 *  month the payment was physically recorded in. */
export const getEffectiveCollectedForMonth = (tenant: Tenant, targetMonth: string): number => {
  const breakdown = getPaymentBreakdown(tenant);
  const totalPaid = Object.values(tenant.payments || {}).reduce((s, v) => s + v, 0);
  let remaining = totalPaid;
  for (const entry of breakdown) {
    if (remaining <= 0) break;
    const allocated = Math.min(remaining, entry.due);
    remaining -= allocated;
    if (entry.month === targetMonth) return allocated;
  }
  return 0;
};

export const shouldShowReminder = (apartmentName: string): { show: boolean; message: string } => {
  const now = new Date();
  const day = now.getDate();
  if (day >= 7 && day < 10) {
    return {
      show: true,
      message: `Reminder: Rent for ${apartmentName || 'your apartment'} is due in ${10 - day} day${10 - day !== 1 ? 's' : ''}!`,
    };
  }
  return { show: false, message: '' };
};
