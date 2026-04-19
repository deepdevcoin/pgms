import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';
import { OwnerSummary, PG } from '../../core/models';

@Component({
    selector: 'app-owner-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink, MatIconModule],
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
      <div class="k" data-testid="kpi-pgs"><div class="kl">Properties</div><div class="kv">{{ summary()?.totalPgs ?? '—' }}</div></div>
      <div class="k" data-testid="kpi-rooms"><div class="kl">Total rooms</div><div class="kv">{{ summary()?.totalRooms ?? '—' }}</div></div>
      <div class="k" data-testid="kpi-active-tenants"><div class="kl">Active tenants</div><div class="kv">{{ summary()?.totalActiveTenants ?? '—' }}</div></div>
      <div class="k" data-testid="kpi-vacancies"><div class="kl">Vacancies</div><div class="kv vacant">{{ summary()?.totalVacantRooms ?? '—' }}</div></div>
      <div class="k" data-testid="kpi-collected"><div class="kl">Collected · this mo.</div><div class="kv money">₹{{ (summary()?.totalRentCollectedThisMonth || 0) | number:'1.0-0' }}</div></div>
      <div class="k" data-testid="kpi-pending"><div class="kl">Pending · this mo.</div><div class="kv money warn">₹{{ (summary()?.totalRentPendingThisMonth || 0) | number:'1.0-0' }}</div></div>
    </div>

    <div class="grid">
      <div class="card col-2">
        <div class="card-head">
          <h3>Properties</h3>
          <a routerLink="/owner/pgs" data-testid="link-all-pgs">View all →</a>
        </div>
        <div class="pg-list">
          @for (pg of pgs(); track pg.id) {
            <a [routerLink]="['/owner/layout', pg.id]" class="pg-row" [attr.data-testid]="'pg-row-' + pg.id">
              <div class="pg-name">
                <mat-icon>domain</mat-icon>
                <div>
                  <div class="n">{{ pg.name }}</div>
                  <div class="a">{{ pg.address }}</div>
                </div>
              </div>
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
        <div class="card-head">
          <h3>Complaints</h3>
        </div>
        <div class="complaint-list">
          <div class="row"><span>Open</span><strong>{{ summary()?.openComplaints ?? 0 }}</strong></div>
          <div class="row warn"><span>Escalated</span><strong>{{ summary()?.escalatedComplaints ?? 0 }}</strong></div>
          <div class="row"><span>Against managers</span><strong>{{ summary()?.managerComplaints ?? 0 }}</strong></div>
          <div class="row money"><span>Fines outstanding</span><strong>₹{{ (summary()?.totalFinesOutstanding || 0) | number:'1.0-0' }}</strong></div>
        </div>
      </div>

      <div class="card col-3">
        <div class="card-head">
          <h3>Advance refund queue</h3>
        </div>
        @if ((summary()?.advanceRefundQueue || []).length === 0) {
          <div class="empty">No pending refunds.</div>
        } @else {
          <table>
            <thead><tr><th>Tenant</th><th>Room</th><th class="right">Amount</th></tr></thead>
            <tbody>
              @for (r of summary()?.advanceRefundQueue || []; track r.tenantName) {
                <tr><td>{{ r.tenantName }}</td><td class="mono">{{ r.roomNumber }}</td><td class="right mono">₹{{ r.advanceRefundAmount | number:'1.0-0' }}</td></tr>
              }
            </tbody>
          </table>
        }
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
    .btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
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

    .pg-list { display: flex; flex-direction: column; gap: 8px; }
    .pg-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border: 1px solid var(--border); border-radius: 12px; transition: border-color 140ms ease, transform 140ms ease; background: var(--bg-elev); }
    .pg-row:hover { border-color: var(--border-soft); transform: translateX(2px); }
    .pg-name { display: flex; align-items: center; gap: 12px; }
    .pg-name mat-icon { color: var(--primary); }
    .n { font-weight: 600; font-size: 14px; }
    .a { color: var(--text-muted); font-size: 12px; }
    .pg-counts { display: flex; align-items: center; gap: 6px; }
    .pg-counts .chev { color: var(--text-dim); margin-left: 6px; }

    .complaint-list { display: flex; flex-direction: column; gap: 10px; }
    .complaint-list .row { display: flex; justify-content: space-between; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; font-size: 13px; background: var(--bg-elev); }
    .complaint-list .row.warn { color: var(--status-vacating-text); border-color: rgba(251,191,36,0.3); }
    .complaint-list .row.money strong { font-family: var(--font-mono); }

    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 10px 12px; border-bottom: 1px solid var(--border); text-align: left; }
    th { font-size: 11px; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; }
    .right { text-align: right; }
    .mono { font-family: var(--font-mono); }
    .empty { padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px; }
  `]
})
export class OwnerDashboardComponent {
    private api = inject(ApiService);
    summary = signal<OwnerSummary | null>(null);
    pgs = signal<PG[]>([]);

    constructor() {
        this.api.ownerSummary().subscribe({ next: s => this.summary.set(s) });
        this.api.listPgs().subscribe({ next: p => this.pgs.set(p) });
    }
}