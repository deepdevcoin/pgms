import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Role } from '../../core/models';
import { ActionConfig, CellClassValue, ModuleKey, Row } from './operations.types';

@Component({
  selector: 'app-operations-table',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="table card" data-testid="ops-table">
      <div
        class="thead"
        [style.grid-template-columns]="gridTemplate()"
        [style.min-width]="resolvedMinWidth()"
        [class.thead--payments]="moduleKey === 'payments'"
        [class.thead--compact]="compact"
      >
        @for (col of columns; track col) {
          <div [class.head-cell--right]="alignRight(col)">{{ label(col) }}</div>
        }
        @if (showActions) {
          <div class="head-cell--actions" [class.head-cell--compact-actions]="moduleKey === 'payments' && compact">{{ actionColumnLabel }}</div>
        }
      </div>
      @for (row of rows; track rowKey(row)) {
        <div
          class="tr"
          [style.grid-template-columns]="gridTemplate()"
          [style.min-width]="resolvedMinWidth()"
          [class.tr--payments]="moduleKey === 'payments'"
          [class.tr--compact]="compact"
        >
          @for (col of columns; track col) {
            <div
              [class.money]="moneyColumn(col)"
              [class.cell--status]="statusColumn(col)"
              [class.cell--right]="alignRight(col)"
              [class.cell--wrap]="wrapColumn(col)"
              [ngClass]="cellClass(row, col)"
            >
              @if (statusColumn(col)) {
                <span class="pill dot" [ngClass]="pillClass((row[col]))">{{ row[col] || '-' }}</span>
              } @else {
                {{ value(row, col) }}
              }
            </div>
          }
          @if (showActions) {
            <div class="actions" [class.actions--compact]="compact" [class.actions--payments-compact]="moduleKey === 'payments' && compact">
              @for (action of actions; track action.label) {
                @if (action.show(row, role)) {
                  <button class="icon" type="button" (click)="action.run(row)" [title]="action.label" [class.action-pill]="moduleKey === 'payments' && !compact">
                    <mat-icon>{{ action.icon }}</mat-icon>
                    @if (moduleKey === 'payments' && !compact) { <span>{{ action.label }}</span> }
                  </button>
                }
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .table { overflow: auto; border-radius: 8px; }
    .thead, .tr { display: grid; gap: 14px; align-items: center; }
    .thead { padding: 14px 18px; color: var(--text-muted); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid var(--border); }
    .thead--payments { padding-top: 14px; padding-bottom: 14px; background: rgba(255,255,255,0.02); }
    .thead--compact { padding: 11px 14px; gap: 10px; }
    .tr { padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; }
    .tr--payments { min-height: 64px; }
    .tr--payments:hover { background: rgba(255,255,255,0.02); }
    .tr--compact { padding: 12px 14px; font-size: 12px; gap: 10px; }
    .tr:last-child { border-bottom: 0; }
    .money { font-family: var(--font-mono); }
    .cell--status { display: flex; align-items: center; }
    .cell--right, .head-cell--right, .head-cell--actions { text-align: right; }
    .head-cell--compact-actions { padding-right: 2px; }
    .cell--wrap { white-space: normal; line-height: 1.45; }
    .actions { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: nowrap; align-items: center; min-height: 32px; }
    .actions--compact { gap: 4px; }
    .actions--payments-compact { justify-content: flex-end; }
    .icon { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; border: 1px solid var(--border); background: var(--bg-elev); color: var(--text-muted); cursor: pointer; transition: border-color 120ms ease, color 120ms ease, background 120ms ease; }
    .icon:hover { color: var(--primary); border-color: var(--primary); }
    .icon mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .action-pill { width: auto; height: 34px; display: inline-flex; align-items: center; gap: 6px; padding: 0 10px; border-radius: 999px; }
    .action-pill span { font-size: 12px; font-weight: 600; }
    .pill--paid, .pill--resolved, .pill--completed, .pill--approved { background: var(--status-vacant-bg); border-color: var(--status-vacant-border); color: var(--status-vacant-text); }
    .pill--pending, .pill--requested, .pill--open { background: var(--status-vacating-bg); border-color: var(--status-vacating-border); color: var(--status-vacating-text); }
    .pill--overdue, .pill--rejected, .pill--escalated { background: rgba(248,113,113,0.14); border-color: rgba(248,113,113,0.5); color: var(--danger); }
    .pill--partial, .pill--confirmed, .pill--in_progress { background: var(--status-occupied-bg); border-color: var(--status-occupied-border); color: var(--status-occupied-text); }
  `]
})
export class OperationsTableComponent {
  @Input() columns: string[] = [];
  @Input() rows: Row[] = [];
  @Input() actions: ActionConfig[] = [];
  @Input() role: Role | null = null;
  @Input() moduleKey: ModuleKey = 'complaints';
  @Input() showActions = true;
  @Input() actionColumnLabel = 'Actions';
  @Input() compact = false;
  @Input() minWidth = '';
  @Input() label: (col: string) => string = (col: string) => col;
  @Input() value: (row: Row, col: string) => string = () => '-';
  @Input() rowKey: (row: Row) => string = (row: Row) => JSON.stringify(row);
  @Input() moneyColumn: (col: string) => boolean = () => false;
  @Input() statusColumn: (col: string) => boolean = () => false;
  @Input() pillClass: (status: unknown) => string = () => '';
  @Input() cellClass: (row: Row, col: string) => CellClassValue = () => '';

  gridTemplate(): string {
    if (this.moduleKey === 'payments' && this.compact) {
      return this.compactPaymentTemplate();
    }
    const cells = this.columns.map(col => this.columnWidth(col));
    if (this.showActions) cells.push(this.moduleKey === 'payments' ? (this.compact ? 'minmax(118px, 136px)' : 'minmax(156px, 190px)') : 'minmax(92px, 132px)');
    return cells.join(' ');
  }

  resolvedMinWidth(): string {
    if (this.minWidth) return this.minWidth;
    if (this.moduleKey === 'payments' && this.compact) {
      return this.columns.includes('tenantName') ? '980px' : '760px';
    }
    const base = this.showActions ? 170 : 0;
    return `${Math.max(680, this.columns.length * (this.compact ? (this.moduleKey === 'payments' ? 88 : 112) : 128) + base)}px`;
  }

  alignRight(col: string): boolean {
    return this.moneyColumn(col) || ['bookingCount', 'capacity', 'readCount'].includes(col);
  }

  wrapColumn(col: string): boolean {
    return ['notes', 'itemNames', 'content', 'description', 'facilityName', 'title'].includes(col);
  }

  private columnWidth(col: string): string {
    if (this.wrapColumn(col)) return 'minmax(190px, 1.45fr)';
    if (this.statusColumn(col)) return 'minmax(112px, 0.88fr)';
    if (['tenantName', 'createdByName', 'pgName', 'targetType'].includes(col)) return 'minmax(136px, 1.1fr)';
    if (['roomNumber', 'billingMonth', 'dueDate', 'slotDate', 'startDate', 'endDate', 'startTime', 'endTime', 'createdAt'].includes(col)) return 'minmax(108px, 0.9fr)';
    if (this.moneyColumn(col)) return 'minmax(108px, 0.88fr)';
    return 'minmax(100px, 1fr)';
  }

  private compactPaymentTemplate(): string {
    const cells: string[] = this.columns.map(col => {
      if (col === 'tenantName') return 'minmax(104px, 1.05fr)';
      if (col === 'pgName') return 'minmax(96px, 0.95fr)';
      if (col === 'roomNumber') return 'minmax(66px, 0.66fr)';
      if (col === 'billingMonth') return 'minmax(74px, 0.78fr)';
      if (col === 'dueDate') return 'minmax(80px, 0.82fr)';
      if (this.statusColumn(col)) return 'minmax(84px, 0.82fr)';
      if (this.moneyColumn(col)) return 'minmax(74px, 0.76fr)';
      return 'minmax(72px, 0.8fr)';
    });
    if (this.showActions) cells.push('44px');
    return cells.join(' ');
  }
}
