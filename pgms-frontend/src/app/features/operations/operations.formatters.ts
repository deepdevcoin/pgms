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
  signedAmount: 'Impact',
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
    { label: 'Wallet', value: money(summary.walletBalance), meta: role === 'TENANT' ? 'Available wallet credit' : `Across ${summary.tenantCount} tenants`, money: true },
    { label: 'Transactions', value: String(summary.transactionCount), meta: summary.currentBillingMonth || 'Ledger activity', money: false }
  ];
}

export function transactionColumns(role: Role | null): string[] {
  return role === 'TENANT'
    ? ['createdAt', 'billingMonth', 'transactionType', 'paymentMethod', 'amount', 'signedAmount', 'outstandingAfter', 'notes']
    : ['createdAt', 'tenantName', 'pgName', 'roomNumber', 'billingMonth', 'transactionType', 'paymentMethod', 'amount', 'signedAmount', 'outstandingAfter', 'createdByName'];
}

export function formatTransactionValue(tx: PaymentTransaction, col: string, rows: Row[]): string {
  const value = (tx as unknown as Record<string, unknown>)[col];
  if (col === 'pgName') {
    const record = rows.find(row => row['tenantProfileId'] === tx.tenantProfileId && row['billingMonth'] === tx.billingMonth);
    return String(record?.['pgName'] || '-');
  }
  if (value === undefined || value === null || value === '') return '-';
  if (col === 'createdAt') return new Date(String(value)).toLocaleString();
  if (col === 'transactionType' || col === 'paymentMethod') return prettyEnum(String(value));
  if (typeof value === 'number' && isMoneyColumn(col)) return money(value);
  return String(value);
}

export function money(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

export function prettyEnum(value: string): string {
  return value.toLowerCase().split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}
