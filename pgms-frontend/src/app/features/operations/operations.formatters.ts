import { PaymentSummary, PaymentTransaction, Role } from '../../core/models';
import { Row, SummaryCard } from './operations.types';

const COLUMN_LABELS: Record<string, string> = {
  tenantName: 'Tenant',
  pgName: 'PG',
  roomNumber: 'Room',
  billingMonth: 'Month',
  rentAmount: 'Rent',
  totalDue: 'Due',
  amountPaid: 'Paid',
  fineAccrued: 'Fine',
  remainingAmountDue: 'Pending',
  dueDate: 'Due Date',
  bookingCount: 'Booked',
  createdAt: 'Time',
  transactionType: 'Type',
  paymentMethod: 'Method',
  signedAmount: 'Amount',
  outstandingAfter: 'Balance After',
  createdByName: 'Recorded By',
  notes: 'Notes'
};

export function labelForColumn(col: string): string {
  return COLUMN_LABELS[col] || col.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
}

export function isMoneyColumn(col: string): boolean {
  return ['amount', 'rentAmount', 'fineAccrued', 'amountPaid', 'totalDue', 'remainingAmountDue', 'advanceRefundAmount', 'signedAmount', 'outstandingBefore', 'outstandingAfter', 'walletBalanceBefore', 'walletBalanceAfter'].some(key => col.includes(key));
}

export function isStatusColumn(col: string): boolean {
  return col === 'status';
}

export function pillClassForStatus(status: unknown): string {
  return `pill--${String(status || '').toLowerCase()}`;
}

export function formatRowValue(row: Row, col: string, pgName: (value: string) => string): string {
  const value = row[col];
  if (value === undefined || value === null || value === '') return '-';
  if (col === 'pgId') return pgName(String(value));
  if (typeof value === 'number' && isMoneyColumn(col)) return money(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function buildPaymentSummaryCards(summary: PaymentSummary | null, role: Role | null): SummaryCard[] {
  if (!summary) return [];
  return [
    { label: 'Total Due', value: money(summary.totalDue), meta: `${summary.totalRecords} rent records`, money: true },
    { label: 'Collected', value: money(summary.totalPaid), meta: `${summary.paidRecords} fully paid`, money: true },
    { label: 'Outstanding', value: money(summary.totalOutstanding), meta: `${summary.partialRecords + summary.pendingRecords + summary.overdueRecords} open balances`, money: true },
    { label: 'Overdue', value: money(summary.overdueAmount), meta: `${summary.overdueRecords} overdue records`, money: true },
    { label: 'Fines', value: money(summary.fineOutstanding), meta: 'Current fine exposure', money: true },
    { label: 'Wallet', value: money(summary.walletBalance), meta: role === 'TENANT' ? 'Use wallet against any pending due' : `Across ${summary.tenantCount} tenants`, money: true }
  ];
}

export function transactionColumns(role: Role | null): string[] {
  return role === 'TENANT'
    ? ['createdAt', 'billingMonth', 'transactionType', 'signedAmount', 'outstandingAfter', 'notes']
    : ['createdAt', 'tenantName', 'pgName', 'roomNumber', 'billingMonth', 'transactionType', 'signedAmount', 'outstandingAfter'];
}

export function formatTransactionValue(tx: PaymentTransaction, col: string, rows: Row[]): string {
  const value = (tx as unknown as Record<string, unknown>)[col];
  if (col === 'pgName') {
    const record = rows.find(row => row['tenantProfileId'] === tx.tenantProfileId && row['billingMonth'] === tx.billingMonth);
    return String(record?.['pgName'] || '-');
  }
  if (value === undefined || value === null || value === '') return '-';
  if (col === 'createdAt') return compactDateTime(String(value));
  if (col === 'billingMonth') return prettyBillingMonth(String(value));
  if (col === 'transactionType' || col === 'paymentMethod') return prettyEnum(String(value));
  if (col === 'signedAmount' && typeof value === 'number') return signedMoney(value);
  if (typeof value === 'number' && isMoneyColumn(col)) return money(value);
  return String(value);
}

export function money(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

export function signedMoney(value: number): string {
  if (value === 0) return money(0);
  return `${value > 0 ? '+' : '-'}${money(Math.abs(value))}`;
}

export function prettyEnum(value: string): string {
  return value.toLowerCase().split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function compactDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

function prettyBillingMonth(value: string): string {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}
