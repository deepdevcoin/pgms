import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';
import { Complaint, Notice, OwnerSummary, PG, RentRecord } from '../../core/models';
import { DisplayDatePipe } from '../../shared/display-date.pipe';
import { OperationsTableComponent } from '../operations/operations-table.component';
import { formatRowValue, isMoneyColumn, isStatusColumn, labelForColumn, pillClassForStatus } from '../operations/operations.formatters';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, OperationsTableComponent, DisplayDatePipe],
  template: `
  <section class="dash fade-up" data-testid="owner-dashboard">
    <header class="head">
      <div>
        <div class="crumb">Owner console</div>
        <h1>Portfolio overview</h1>
        <p class="sub">Status of every building, in one glance.</p>
      </div>
      <a routerLink="/owner/layout" class="btn btn--primary" data-testid="cta-open-layout">
        <mat-icon>grid_view</mat-icon>
        <span>Open layout</span>
      </a>
    </header>

    <div class="kpis">
      <div class="k"><div class="kl">Properties</div><div class="kv">{{ summary()?.totalPgs ?? '—' }}</div></div>
      <div class="k"><div class="kl">Total rooms</div><div class="kv">{{ summary()?.totalRooms ?? '—' }}</div></div>
      <div class="k"><div class="kl">Active tenants</div><div class="kv">{{ summary()?.totalActiveTenants ?? '—' }}</div></div>
      <div class="k"><div class="kl">Vacancies</div><div class="kv vacant">{{ summary()?.totalVacantRooms ?? '—' }}</div></div>
      <div class="k"><div class="kl">Collected · this mo.</div><div class="kv money">₹{{ (summary()?.totalRentCollectedThisMonth || 0) | number:'1.0-0' }}</div></div>
      <div class="k"><div class="kl">Pending · this mo.</div><div class="kv money warn">₹{{ (summary()?.totalRentPendingThisMonth || 0) | number:'1.0-0' }}</div></div>
    </div>

    <div class="grid">
      <div class="card col-2">
        <div class="card-head"><h3>Properties</h3><a routerLink="/owner/pgs">View all →</a></div>
        <div class="pg-list">
          @for (pg of pgs(); track pg.id) {
            <a [routerLink]="['/owner/layout', pg.id]" class="pg-row">
              <div class="pg-name"><mat-icon>domain</mat-icon><div><div class="n">{{ pg.name }}</div><div class="a">{{ pg.address }}</div></div></div>
              <div class="pg-counts">
                <span class="pill dot pill--vacant">{{ pg.vacantCount }} vacant</span>
                <span class="pill dot pill--occupied">{{ pg.occupiedCount }} occupied</span>
                <span class="pill dot pill--vacating" *ngIf="pg.vacatingCount">{{ pg.vacatingCount }} vacating</span>
                <mat-icon class="chev">chevron_right</mat-icon>
              </div>
            </a>
          } @empty {
            <div class="empty">No PGs yet.</div>
          }
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Complaints</h3></div>
        <div class="complaint-list">
          <div class="row"><span>Open</span><strong>{{ summary()?.openComplaints ?? 0 }}</strong></div>
          <div class="row warn"><span>Escalated</span><strong>{{ summary()?.escalatedComplaints ?? 0 }}</strong></div>
          <div class="row"><span>Against managers</span><strong>{{ summary()?.managerComplaints ?? 0 }}</strong></div>
          <div class="row money"><span>Fines outstanding</span><strong>₹{{ (summary()?.totalFinesOutstanding || 0) | number:'1.0-0' }}</strong></div>
        </div>
      </div>

      <div class="card col-3">
        <div class="card-head"><h3>Payments</h3><a routerLink="/owner/payments">Open payments →</a></div>
        @if (payments().length === 0) {
          <div class="empty">No payment records yet.</div>
        } @else {
          <app-operations-table
            [columns]="paymentColumns"
            [rows]="payments()"
            [showActions]="false"
            [compact]="true"
            [moduleKey]="'payments'"
            [label]="label"
            [value]="value"
            [rowKey]="rowKey"
            [moneyColumn]="moneyColumn"
            [statusColumn]="statusColumn"
            [pillClass]="pillClass"
            [minWidth]="'100%'"
          />
        }
      </div>

      <div class="card">
        <div class="card-head"><h3>Recent notices</h3><a routerLink="/owner/notices">Open notices →</a></div>
        <div class="stack-list">
          @for (notice of notices(); track notice.id) {
            <div class="stack-row">
              <div><div class="title">{{ notice.title }}</div><div class="meta">{{ notice.createdByName }} · {{ notice.createdAt | displayDate }}</div></div>
              <span class="pill dot">{{ notice.readCount || 0 }} reads</span>
            </div>
          } @empty { <div class="empty">No notices yet.</div> }
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Recent complaints</h3><a routerLink="/owner/complaints">Open complaints →</a></div>
        <div class="stack-list">
          @for (complaint of complaints(); track complaint.id) {
            <div class="stack-row">
              <div><div class="title">{{ complaint.tenantName || 'Tenant' }} · {{ complaint.category }}</div><div class="meta">{{ complaint.roomNumber }} · {{ complaint.createdAt | displayDate }}</div></div>
              <span class="pill dot" [ngClass]="statusClass(complaint.status)">{{ complaint.status }}</span>
            </div>
          } @empty { <div class="empty">No complaints yet.</div> }
        </div>
      </div>
    </div>
  </section>
  `,
  styles: [`
    .dash { display: flex; flex-direction: column; gap: 20px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .crumb { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h1 { margin: 6px 0 2px; font-size: 30px; letter-spacing: -0.02em; }
    .sub { color: var(--text-muted); font-size: 13px; margin: 0; }
    .btn { display: inline-flex; align-items: center; gap: 8px; }
    .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
    @media (max-width: 1200px) { .kpis { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 640px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
    .k { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px; }
    .kl { font-size: 11px; color: var(--text-muted); letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; }
    .kv { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; margin-top: 6px; font-family: var(--font-mono); }
    .kv.money { font-size: 20px; }
    .kv.vacant { color: var(--status-vacant-text); }
    .kv.warn { color: var(--status-vacating-text); }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    @media (max-width: 960px) { .grid { grid-template-columns: 1fr; } }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
    .col-2 { grid-column: span 1; }
    .col-3 { grid-column: 1 / -1; }
    .card-head { display: flex; justify-content: space-between; align-items: center; }
    .card-head h3 { margin: 0; font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
    .card-head a { color: var(--primary); font-size: 12px; font-weight: 600; }
    .pg-list, .stack-list { display: flex; flex-direction: column; gap: 8px; }
    .pg-row, .stack-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg-elev); }
    .pg-name { display: flex; align-items: center; gap: 12px; }
    .pg-name mat-icon { color: var(--primary); }
    .n, .title { font-weight: 600; font-size: 14px; }
    .a, .meta { color: var(--text-muted); font-size: 12px; }
    .pg-counts { display: flex; align-items: center; gap: 6px; }
    .complaint-list { display: flex; flex-direction: column; gap: 10px; }
    .complaint-list .row { display: flex; justify-content: space-between; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; font-size: 13px; background: var(--bg-elev); }
    .complaint-list .row.warn { color: var(--status-vacating-text); }
    .empty { padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px; }
  `]
})
export class OwnerDashboardComponent {
  private api = inject(ApiService);
  paymentColumns = ['tenantName', 'roomNumber', 'billingMonth', 'totalDue', 'amountPaid', 'fineAccrued', 'status'];
  summary = signal<OwnerSummary | null>(null);
  pgs = signal<PG[]>([]);
  payments = signal<RentRecord[]>([]);
  notices = signal<Notice[]>([]);
  complaints = signal<Complaint[]>([]);

  constructor() {
    this.api.ownerSummary().subscribe({ next: s => this.summary.set(s) });
    this.api.listPgs().subscribe({ next: p => this.pgs.set(p) });
    this.api.listPayments().subscribe({ next: items => this.payments.set(items.slice(0, 6)) });
    this.api.listNotices().subscribe({ next: items => this.notices.set(items.slice(0, 4)) });
    this.api.listComplaints().subscribe({ next: items => this.complaints.set(items.slice(0, 4)) });
  }

  statusClass(status: string | undefined) {
    return `pill--${String(status || '').toLowerCase()}`;
  }

  label = (col: string) => labelForColumn(col);
  value = (row: Record<string, any>, col: string) => formatRowValue(row, col, value => value);
  rowKey = (row: Record<string, any>) => String(row['id'] ?? JSON.stringify(row));
  moneyColumn = (col: string) => isMoneyColumn(col);
  statusColumn = (col: string) => isStatusColumn(col);
  pillClass = (status: unknown) => pillClassForStatus(status);
}
