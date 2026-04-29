import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
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
        [class.thead--ops-compact]="compact && moduleKey !== 'payments'"
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
          [class.tr--ops-compact]="compact && moduleKey !== 'payments'"
          [class.tr--notice]="moduleKey === 'notices'"
          [class.tr--clickable]="clickableRows"
          [attr.tabindex]="clickableRows ? 0 : null"
          [attr.role]="clickableRows ? 'button' : null"
          (click)="selectRow(row)"
          (keydown.enter)="selectRow(row)"
          (keydown.space)="selectRow(row, $event)"
        >
          @for (col of columns; track col) {
            <div
              [class.money]="moneyColumn(col)"
              [class.cell--status]="statusColumn(col)"
              [class.cell--right]="alignRight(col)"
              [class.cell--wrap]="wrapColumn(col)"
              [class.cell--details]="col === 'details' || col === 'serviceSummary'"
              [ngClass]="cellClass(row, col)"
            >
              @if (statusColumn(col)) {
                <span class="pill dot" [ngClass]="pillClass(value(row, col))">{{ value(row, col) }}</span>
              } @else if (moduleKey === 'notices' && col === 'timeRemaining') {
                <span class="pill dot" [ngClass]="value(row, col) === 'Sent' ? 'pill--sent' : 'pill--countdown'">{{ value(row, col) }}</span>
              } @else if (col === 'details') {
                <div class="detail-block">
                  <div class="detail-main">{{ row['description'] || '-' }}</div>
                  @if (row['latestActivitySummary']) {
                    <div class="detail-notes">{{ row['latestActivitySummary'] }}</div>
                  } @else {
                    <div class="detail-notes detail-notes--empty">No updates yet.</div>
                  }
                  @if (row['activityCount']) {
                    <div class="detail-meta">{{ row['activityCount'] }} entr{{ row['activityCount'] === 1 ? 'y' : 'ies' }} in timeline</div>
                  }
                </div>
              } @else if (col === 'serviceSummary') {
                <div class="detail-block">
                  <div class="detail-kicker">Request</div>
                  <div class="detail-main">{{ row['requestNotes'] || 'No service note provided.' }}</div>
                  @if (row['managerNotes']) {
                    <div class="detail-kicker">Operations</div>
                    <div class="detail-notes">{{ row['managerNotes'] }}</div>
                  }
                  <div class="detail-meta">{{ serviceMeta(row) }}</div>
                </div>
              } @else {
                {{ value(row, col) }}
              }
            </div>
          }
          @if (showActions) {
            <div class="actions" [class.actions--compact]="compact" [class.actions--payments-compact]="moduleKey === 'payments' && compact">
              @for (action of actions; track action.label) {
                @if (action.show(row, role)) {
                  <button class="icon" type="button" (click)="runAction(action, row, $event)" [title]="action.label" [class.action-pill]="moduleKey === 'payments' && !compact">
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
    .thead--ops-compact { padding: 9px 12px; gap: 8px; font-size: 10px; letter-spacing: 0.08em; }
    .tr { padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; }
    .tr--payments { min-height: 64px; }
    .tr--payments:hover { background: rgba(255,255,255,0.02); }
    .tr--compact { padding: 12px 14px; font-size: 12px; gap: 10px; }
    .tr--ops-compact { padding: 10px 12px; font-size: 12px; gap: 8px; min-height: 52px; }
    .tr:last-child { border-bottom: 0; }
    .tr--notice { align-items: start; padding-top: 18px; padding-bottom: 18px; }
    .tr--clickable { cursor: pointer; transition: background 120ms ease, border-color 120ms ease; }
    .tr--clickable:hover, .tr--clickable:focus-visible { background: rgba(255,255,255,0.03); outline: none; }
    .money { font-family: var(--font-mono); }
    .cell--status { display: flex; align-items: center; }
    .cell--details { display: block; }
    .cell--right, .head-cell--right, .head-cell--actions { text-align: right; }
    .head-cell--compact-actions { padding-right: 2px; }
    .cell--wrap { white-space: normal; line-height: 1.45; }
    .tr--notice .cell--wrap { line-height: 1.55; }
    .detail-block { display: grid; gap: 6px; }
    .detail-kicker { color: var(--text-muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
    .detail-main { color: var(--text); line-height: 1.5; }
    .detail-notes {
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.5;
      padding-top: 6px;
      border-top: 1px solid rgba(255,255,255,0.06);
      white-space: pre-line;
    }
    .detail-notes--empty { font-style: italic; }
    .detail-meta { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
    .actions { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: nowrap; align-items: center; min-height: 32px; }
    .actions--compact { gap: 4px; min-height: 28px; }
    .actions--payments-compact { justify-content: flex-end; }
    .icon { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; border: 1px solid var(--border); background: var(--bg-elev); color: var(--text-muted); cursor: pointer; transition: border-color 120ms ease, color 120ms ease, background 120ms ease; }
    .tr--ops-compact .icon { width: 28px; height: 28px; border-radius: 8px; }
    .icon:hover { color: var(--primary); border-color: var(--primary); }
    .icon mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .tr--ops-compact .icon mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .action-pill { width: auto; height: 34px; display: inline-flex; align-items: center; gap: 6px; padding: 0 10px; border-radius: 999px; }
    .action-pill span { font-size: 12px; font-weight: 600; }
    .pill--paid, .pill--resolved, .pill--completed, .pill--approved { background: var(--status-vacant-bg); border-color: var(--status-vacant-border); color: var(--status-vacant-text); }
    .pill--pending, .pill--requested, .pill--open { background: var(--status-vacating-bg); border-color: var(--status-vacating-border); color: var(--status-vacating-text); }
    .pill--overdue, .pill--rejected, .pill--escalated { background: rgba(248,113,113,0.14); border-color: rgba(248,113,113,0.5); color: var(--danger); }
    .pill--partial, .pill--confirmed, .pill--in_progress { background: var(--status-occupied-bg); border-color: var(--status-occupied-border); color: var(--status-occupied-text); }
    .pill--scheduled { background: rgba(96,165,250,0.14); border-color: rgba(96,165,250,0.42); color: #bfdbfe; }
    .pill--sent { background: rgba(34,197,94,0.14); border-color: rgba(34,197,94,0.38); color: #86efac; }
    .pill--read { background: rgba(34,197,94,0.14); border-color: rgba(34,197,94,0.38); color: #86efac; }
    .pill--unread { background: rgba(251,191,36,0.14); border-color: rgba(251,191,36,0.42); color: #fde68a; }
    .pill--countdown { background: rgba(96,165,250,0.14); border-color: rgba(96,165,250,0.42); color: #bfdbfe; font-family: var(--font-mono); }
    .pill--all_pgs { background: rgba(99,102,241,0.14); border-color: rgba(99,102,241,0.42); color: #c7d2fe; }
    .pill--all_tenants { background: rgba(20,184,166,0.14); border-color: rgba(20,184,166,0.42); color: #99f6e4; }
    .pill--specific_pg { background: rgba(245,158,11,0.14); border-color: rgba(245,158,11,0.42); color: #fde68a; }
    .pill--all_managers { background: rgba(168,85,247,0.14); border-color: rgba(168,85,247,0.42); color: #e9d5ff; }
    .pill--specific_tenant { background: rgba(236,72,153,0.14); border-color: rgba(236,72,153,0.42); color: #fbcfe8; }
    .cell--notice-scheduled { border-left: 3px solid rgba(96,165,250,0.75); padding-left: 10px; }
  `]
})
export class OperationsTableComponent {
  @Input() columns: string[] = [];
  @Input() rows: Row[] = [];
  @Input() actions: ActionConfig[] = [];
  @Input() role: Role | null = null;
  @Input() moduleKey: ModuleKey = 'complaints';
  @Input() showActions = true;
  @Input() clickableRows = false;
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
  @Output() rowClick = new EventEmitter<Row>();

  gridTemplate(): string {
    if (this.moduleKey === 'payments' && this.compact) {
      return this.compactPaymentTemplate();
    }
    if (this.compact && this.moduleKey === 'complaints') {
      return this.compactComplaintTemplate();
    }
    if (this.compact && this.moduleKey === 'services') {
      return this.compactServiceTemplate();
    }
    if (this.moduleKey === 'notices') {
      return this.noticeTemplate();
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
    if (this.compact && this.moduleKey === 'complaints') {
      return '860px';
    }
    if (this.compact && this.moduleKey === 'services') {
      return this.columns.includes('tenantName') ? '1120px' : '920px';
    }
    if (this.moduleKey === 'notices') {
      return '100%';
    }
    const base = this.showActions ? 170 : 0;
    return `${Math.max(680, this.columns.length * (this.compact ? (this.moduleKey === 'payments' ? 88 : 112) : 128) + base)}px`;
  }

  alignRight(col: string): boolean {
    return this.moneyColumn(col) || ['bookingCount', 'capacity', 'readCount'].includes(col);
  }

  wrapColumn(col: string): boolean {
    return ['notes', 'itemNames', 'content', 'description', 'facilityName', 'title', 'details', 'serviceSummary'].includes(col);
  }

  private columnWidth(col: string): string {
    if (this.wrapColumn(col)) return 'minmax(190px, 1.45fr)';
    if (this.statusColumn(col)) return 'minmax(112px, 0.88fr)';
    if (['tenantName', 'createdByName', 'pgName', 'targetType'].includes(col)) return 'minmax(136px, 1.1fr)';
    if (['roomNumber', 'billingMonth', 'dueDate', 'slotDate', 'startDate', 'endDate', 'startTime', 'endTime', 'createdAt', 'scheduledAt'].includes(col)) return 'minmax(108px, 0.9fr)';
    if (this.moneyColumn(col)) return 'minmax(108px, 0.88fr)';
    return 'minmax(100px, 1fr)';
  }

  private noticeTemplate(): string {
    const cells: string[] = this.columns.map(col => {
      if (col === 'title') return 'minmax(0, 1.05fr)';
      if (col === 'content') return 'minmax(0, 1.35fr)';
      if (col === 'targetType') return 'minmax(86px, 0.72fr)';
      if (col === 'createdByName') return 'minmax(92px, 0.8fr)';
      if (col === 'createdAt') return 'minmax(92px, 0.68fr)';
      if (col === 'scheduledAt') return 'minmax(92px, 0.68fr)';
      if (col === 'deliveryStatus') return 'minmax(82px, 0.55fr)';
      if (col === 'readStatus') return 'minmax(72px, 0.48fr)';
      if (col === 'timeRemaining') return 'minmax(86px, 0.6fr)';
      if (col === 'readCount') return 'minmax(58px, 0.38fr)';
      return this.columnWidth(col);
    });
    if (this.showActions) cells.push('minmax(76px, 92px)');
    return cells.join(' ');
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

  private compactComplaintTemplate(): string {
    const cells: string[] = this.columns.map(col => {
      if (col === 'id') return '56px';
      if (col === 'tenantName') return 'minmax(104px, 0.95fr)';
      if (col === 'roomNumber') return '72px';
      if (col === 'category') return 'minmax(92px, 0.82fr)';
      if (col === 'details') return 'minmax(280px, 1.9fr)';
      if (this.statusColumn(col)) return 'minmax(92px, 0.85fr)';
      if (col === 'createdAt') return 'minmax(96px, 0.82fr)';
      if (col === 'notes') return 'minmax(170px, 1.2fr)';
      return 'minmax(84px, 0.85fr)';
    });
    if (this.showActions) cells.push('44px');
    return cells.join(' ');
  }

  private compactServiceTemplate(): string {
    const cells: string[] = this.columns.map(col => {
      if (col === 'tenantName') return 'minmax(104px, 0.95fr)';
      if (col === 'pgName') return 'minmax(92px, 0.82fr)';
      if (col === 'roomNumber') return '72px';
      if (col === 'serviceType') return 'minmax(116px, 0.95fr)';
      if (col === 'preferredDate') return '96px';
      if (col === 'preferredTimeWindow') return 'minmax(118px, 0.95fr)';
      if (col === 'serviceSummary') return 'minmax(260px, 1.7fr)';
      if (col === 'rating') return '70px';
      if (this.statusColumn(col)) return 'minmax(92px, 0.82fr)';
      if (col === 'createdAt') return '96px';
      return 'minmax(84px, 0.85fr)';
    });
    if (this.showActions) cells.push('88px');
    return cells.join(' ');
  }

  serviceMeta(row: Row): string {
    const stamp = row['completedAt'] || row['startedAt'] || row['confirmedAt'] || row['updatedAt'] || row['createdAt'];
    const label = row['completedAt']
      ? 'Completed'
      : row['startedAt']
        ? 'Started'
        : row['confirmedAt']
          ? 'Confirmed'
          : row['updatedAt']
            ? 'Updated'
            : 'Requested';
    const formattedStamp = stamp ? this.value({ createdAt: stamp }, 'createdAt') : 'Awaiting next update';
    const rated = row['rating'] ? ` · Rated ${row['rating']}/5` : '';
    return `${label} ${formattedStamp}${rated}`;
  }

  selectRow(row: Row, event?: Event) {
    if (!this.clickableRows) return;
    event?.preventDefault();
    this.rowClick.emit(row);
  }

  runAction(action: ActionConfig, row: Row, event: Event) {
    event.stopPropagation();
    action.run(row);
  }
}
