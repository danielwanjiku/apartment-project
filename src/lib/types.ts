export interface Tenant {
  id: string;
  unitId: string;
  name: string;
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

  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  if (start.getDate() > 10) {
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    if (key > currentMonthKey) break;
    if (key === currentMonthKey && now.getDate() < 10) break;
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
  return getArrearsMonths(tenant).length === 0;
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
