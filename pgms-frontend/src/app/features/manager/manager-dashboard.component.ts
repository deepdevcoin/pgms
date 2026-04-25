import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';
import { Complaint, ManagerSummary, Notice, RentRecord } from '../../core/models';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
  <section class="fade-up" data-testid="manager-dashboard">
    <header class="head">
      <div>
        <div class="crumb">Operations</div>
        <h1>Today at your PG</h1>
        <p class="sub">Your action queue and health of the building.</p>
      </div>
      <a routerLink="/manager/layout" class="btn btn--primary" data-testid="cta-layout">
        <mat-icon>grid_view</mat-icon><span>Open layout</span>
      </a>
    </header>

    <div class="occ-card card">
      <div>
        <div class="eyebrow">Occupancy rate</div>
        <div class="rate"><span>{{ summary()?.occupancyRate ?? 0 }}</span><small>%</small></div>
        <div class="meta">
          {{ summary()?.occupiedBeds ?? summary()?.occupiedRooms ?? 0 }} of {{ summary()?.totalBeds ?? summary()?.totalRooms ?? 0 }} beds occupied
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="k card"><div class="kl">Collected · this mo.</div><div class="kv">₹{{ (summary()?.paymentCollectedThisMonth || 0) | number:'1.0-0' }}</div></div>
      <div class="k card"><div class="kl">Pending · this mo.</div><div class="kv warn">₹{{ (summary()?.paymentPendingThisMonth || 0) | number:'1.0-0' }}</div></div>
      <div class="k card"><div class="kl">Open complaints</div><div class="kv">{{ summary()?.openComplaints ?? 0 }}</div></div>
      <div class="k card"><div class="kl">Pending services</div><div class="kv">{{ summary()?.pendingServiceRequests ?? 0 }}</div></div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Vacate notices</h3></div>
      <div class="notice-list">
        @for (v of summary()?.vacateNotices || []; track v.tenantName) {
          <div class="notice">
            <div><div class="t-name">{{ v.tenantName }}</div><div class="t-date">Intended vacate: {{ v.intendedDate }}</div></div>
            <span class="pill dot" [class.pill--vacant]="v.refundEligible" [class.pill--vacating]="!v.refundEligible">{{ v.refundEligible ? 'Refund eligible' : 'No refund' }}</span>
          </div>
        } @empty { <div class="empty">No pending vacate notices.</div> }
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Pending payments</h3><a routerLink="/manager/payments">Open payments →</a></div>
      <div class="notice-list">
        @for (payment of payments(); track payment.id) {
          <div class="notice">
            <div><div class="t-name">{{ payment.tenantName }} · {{ payment.roomNumber }}</div><div class="t-date">{{ payment.billingMonth }} · Pending ₹{{ payment.remainingAmountDue | number:'1.0-0' }}</div></div>
            <span class="pill dot" [ngClass]="statusClass(payment.status)">{{ payment.status }}</span>
          </div>
        } @empty { <div class="empty">No pending payments.</div> }
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Recent complaints</h3><a routerLink="/manager/complaints">Open complaints →</a></div>
      <div class="notice-list">
        @for (complaint of complaints(); track complaint.id) {
          <div class="notice">
            <div><div class="t-name">{{ complaint.tenantName || 'Tenant' }} · {{ complaint.category }}</div><div class="t-date">{{ complaint.roomNumber }} · {{ complaint.createdAt | date:'mediumDate' }}</div></div>
            <span class="pill dot" [ngClass]="statusClass(complaint.status)">{{ complaint.status }}</span>
          </div>
        } @empty { <div class="empty">No complaints yet.</div> }
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Recent notices</h3><a routerLink="/manager/notices">Open notices →</a></div>
      <div class="notice-list">
        @for (notice of notices(); track notice.id) {
          <div class="notice">
            <div><div class="t-name">{{ notice.title }}</div><div class="t-date">{{ notice.createdByName }} · {{ notice.createdAt | date:'mediumDate' }}</div></div>
            <span class="pill dot">{{ notice.readCount || 0 }} reads</span>
          </div>
        } @empty { <div class="empty">No notices yet.</div> }
      </div>
    </div>
  </section>
  `,
  styles: [`
    section { display: flex; flex-direction: column; gap: 18px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .crumb { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h1 { margin: 6px 0 2px; font-size: 28px; letter-spacing: -0.02em; }
    .sub { color: var(--text-muted); font-size: 13px; margin: 0; }
    .btn { display: inline-flex; align-items: center; gap: 8px; }
    .occ-card { display: flex; justify-content: space-between; align-items: center; padding: 24px 28px; }
    .eyebrow { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    .rate { font-size: 56px; font-weight: 800; letter-spacing: -0.03em; font-family: var(--font-mono); }
    .rate small { font-size: 20px; color: var(--text-muted); margin-left: 4px; font-weight: 500; }
    .meta { color: var(--text-muted); font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    @media (max-width: 960px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    .k { padding: 16px 18px; }
    .kl { font-size: 11px; color: var(--text-muted); letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; }
    .kv { font-size: 24px; font-weight: 700; font-family: var(--font-mono); margin-top: 6px; }
    .kv.warn { color: var(--status-vacating-text); }
    .card-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .card-head h3 { margin: 0 0 12px; font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
    .card-head a { color: var(--primary); font-size: 12px; font-weight: 600; }
    .notice-list { display: flex; flex-direction: column; gap: 8px; }
    .notice { display: flex; justify-content: space-between; align-items: center; padding: 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg-elev); }
    .t-name { font-weight: 600; }
    .t-date { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
    .empty { padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px; }
  `]
})
export class ManagerDashboardComponent {
  private api = inject(ApiService);
  summary = signal<ManagerSummary | null>(null);
  payments = signal<RentRecord[]>([]);
  complaints = signal<Complaint[]>([]);
  notices = signal<Notice[]>([]);

  constructor() {
    this.api.managerSummary().subscribe({ next: s => this.summary.set(s) });
    this.api.listPayments().subscribe({ next: items => this.payments.set(items.filter(item => item.remainingAmountDue > 0).slice(0, 5)) });
    this.api.listComplaints().subscribe({ next: items => this.complaints.set(items.slice(0, 5)) });
    this.api.listNotices().subscribe({ next: items => this.notices.set(items.slice(0, 4)) });
  }

  statusClass(status: string | undefined) {
    return `pill--${String(status || '').toLowerCase()}`;
  }
}
