import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';
import { Complaint, ManagerSummary, Notice, PG, RentRecord, ServiceBooking, VacateNotice } from '../../core/models';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
  <section class="dashboard fade-up" data-testid="manager-dashboard">
    <header class="masthead">
      <div class="masthead-copy">
        <div class="crumb">Operations Desk</div>
        <h1>Run the floor, not the maze</h1>
        <p class="sub">
          A live view of collections, room pressure, complaints, service load, and move-outs across your assigned PGs.
        </p>
      </div>

      <div class="masthead-actions">
        <a routerLink="/manager/payments" class="btn btn--ghost">
          <mat-icon>payments</mat-icon>
          <span>Collections</span>
        </a>
        <a routerLink="/manager/layout" class="btn btn--primary">
          <mat-icon>grid_view</mat-icon>
          <span>Layout</span>
        </a>
      </div>
    </header>

    <section class="command-band">
      <div class="command-main">
        <div class="command-topline">
          <span class="eyebrow">Assigned PGs</span>
          <span class="pg-line">{{ assignedPgNames() }}</span>
        </div>

        <div class="command-grid">
          <div class="command-metric">
            <div class="metric-label">Occupancy</div>
            <div class="metric-value">{{ summary()?.occupancyRate || 0 | number:'1.0-0' }}%</div>
            <div class="metric-note">{{ summary()?.occupiedRooms || 0 }} / {{ summary()?.totalRooms || 0 }} rooms active</div>
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="summary()?.occupancyRate || 0"></div>
            </div>
          </div>

          <div class="command-metric">
            <div class="metric-label">This month</div>
            <div class="metric-stack">
              <div>
                <span>Collected</span>
                <strong>{{ money(summary()?.paymentCollectedThisMonth || 0) }}</strong>
              </div>
              <div>
                <span>Pending</span>
                <strong class="warn">{{ money(summary()?.paymentPendingThisMonth || 0) }}</strong>
              </div>
            </div>
          </div>

          <div class="command-metric">
            <div class="metric-label">Attention</div>
            <div class="metric-value">{{ attentionCount() }}</div>
            <div class="metric-note">{{ overduePayments().length }} overdue · {{ activeComplaints().length }} complaint cases · {{ serviceQueue().length }} services</div>
          </div>
        </div>
      </div>

      <aside class="command-side">
        <div class="mini-stat">
          <span>Pending collection</span>
          <strong>{{ money(totalPending()) }}</strong>
        </div>
        <div class="mini-stat">
          <span>Overdue accounts</span>
          <strong>{{ overduePayments().length }}</strong>
        </div>
        <div class="mini-stat">
          <span>Open complaints</span>
          <strong>{{ activeComplaints().length }}</strong>
        </div>
        <div class="mini-stat">
          <span>Vacate pipeline</span>
          <strong>{{ vacates().length }}</strong>
        </div>
      </aside>
    </section>

    <section class="summary-strip">
      <div class="summary-tile">
        <div class="tile-label">Requested services</div>
        <div class="tile-value">{{ serviceQueue().length }}</div>
      </div>
      <div class="summary-tile">
        <div class="tile-label">Escalated complaints</div>
        <div class="tile-value">{{ escalatedComplaints() }}</div>
      </div>
      <div class="summary-tile">
        <div class="tile-label">Refund eligible vacates</div>
        <div class="tile-value">{{ refundEligibleVacates() }}</div>
      </div>
      <div class="summary-tile">
        <div class="tile-label">Notices published</div>
        <div class="tile-value">{{ notices().length }}</div>
      </div>
    </section>

    <section class="workspace">
      <div class="workspace-main">
        <section class="surface surface--hero">
          <div class="surface-head">
            <div>
              <div class="section-kicker">Collections</div>
              <h2>Payment watchlist</h2>
            </div>
            <a routerLink="/manager/payments">Open payments →</a>
          </div>

          <div class="ledger-rows">
            @for (payment of watchlistPayments(); track payment.id) {
              <div class="ledger-row">
                <div class="ledger-identity">
                  <div class="ledger-title">{{ payment.tenantName }} · {{ payment.roomNumber }}</div>
                  <div class="ledger-meta">{{ payment.pgName || 'Assigned PG' }} · {{ payment.billingMonth }} · Due {{ payment.dueDate || '-' }}</div>
                </div>
                <div class="ledger-finance">
                  <div>
                    <span>Pending</span>
                    <strong>{{ money(payment.remainingAmountDue) }}</strong>
                  </div>
                  <div>
                    <span>Fine</span>
                    <strong>{{ money(payment.fineAccrued) }}</strong>
                  </div>
                </div>
                <span class="pill dot" [ngClass]="paymentBadge(payment)">{{ payment.status }}</span>
              </div>
            } @empty {
              <div class="empty-state">No pending or overdue payments right now.</div>
            }
          </div>
        </section>

        <section class="workspace-grid">
          <section class="surface">
            <div class="surface-head">
              <div>
                <div class="section-kicker">Residents</div>
                <h2>Complaint queue</h2>
              </div>
              <a routerLink="/manager/complaints">Open complaints →</a>
            </div>
            <div class="stack-list">
              @for (complaint of complaintQueue(); track complaint.id) {
                <div class="stack-row">
                  <div>
                    <div class="stack-title">{{ complaint.tenantName || 'Tenant' }} · {{ complaint.category }}</div>
                    <div class="stack-meta">{{ complaint.roomNumber || '-' }} · {{ complaint.createdAt | date:'mediumDate' }}</div>
                  </div>
                  <span class="pill dot" [ngClass]="statusClass(complaint.status)">{{ complaint.status }}</span>
                </div>
              } @empty {
                <div class="empty-state">No complaint backlog right now.</div>
              }
            </div>
          </section>

          <section class="surface">
            <div class="surface-head">
              <div>
                <div class="section-kicker">Field work</div>
                <h2>Service queue</h2>
              </div>
              <a routerLink="/manager/services">Open services →</a>
            </div>
            <div class="stack-list">
              @for (service of serviceQueue(); track service.id) {
                <div class="stack-row">
                  <div>
                    <div class="stack-title">{{ service.tenantName || 'Tenant' }} · {{ service.serviceType }}</div>
                    <div class="stack-meta">{{ service.roomNumber || '-' }} · {{ service.preferredDate }} · {{ service.preferredTimeWindow || 'Flexible' }}</div>
                  </div>
                  <span class="pill dot" [ngClass]="statusClass(service.status)">{{ service.status }}</span>
                </div>
              } @empty {
                <div class="empty-state">No requested services pending.</div>
              }
            </div>
          </section>
        </section>
      </div>

      <aside class="workspace-side">
        <section class="surface">
          <div class="surface-head">
            <div>
              <div class="section-kicker">Movement</div>
              <h2>Vacate pipeline</h2>
            </div>
            <a routerLink="/manager/vacate">Open vacate →</a>
          </div>
          <div class="stack-list">
            @for (vacate of vacates(); track vacate.id) {
              <div class="stack-row">
                <div>
                  <div class="stack-title">{{ vacate.tenantName || 'Tenant' }} · {{ vacate.roomNumber || '-' }}</div>
                  <div class="stack-meta">Intended {{ vacate.intendedVacateDate }} · {{ vacate.referralName ? 'Referral attached' : 'No referral' }}</div>
                </div>
                <span class="pill dot" [ngClass]="vacateBadgeClass(vacate)">{{ vacateBadgeLabel(vacate) }}</span>
              </div>
            } @empty {
              <div class="empty-state">No active vacate notices.</div>
            }
          </div>
        </section>

        <section class="surface">
          <div class="surface-head">
            <div>
              <div class="section-kicker">Communication</div>
              <h2>Recent notices</h2>
            </div>
            <a routerLink="/manager/notices">Open notices →</a>
          </div>
          <div class="stack-list">
            @for (notice of notices(); track notice.id) {
              <div class="stack-row">
                <div>
                  <div class="stack-title">{{ notice.title }}</div>
                  <div class="stack-meta">{{ notice.createdByName || 'System' }} · {{ notice.createdAt | date:'mediumDate' }}</div>
                </div>
                <span class="reads">{{ notice.readCount || 0 }} reads</span>
              </div>
            } @empty {
              <div class="empty-state">No recent notices.</div>
            }
          </div>
        </section>

        <section class="surface">
          <div class="surface-head">
            <div>
              <div class="section-kicker">Portfolio</div>
              <h2>Assigned PGs</h2>
            </div>
            <a routerLink="/manager/layout">Open layout →</a>
          </div>
          <div class="pg-list">
            @for (pg of pgs(); track pg.id) {
              <div class="pg-row">
                <div>
                  <div class="stack-title">{{ pg.name }}</div>
                  <div class="stack-meta">{{ pg.address }}</div>
                </div>
                <div class="pg-totals">
                  <span>{{ pg.occupiedCount }} occupied</span>
                  <span>{{ pg.vacantCount }} vacant</span>
                </div>
              </div>
            } @empty {
              <div class="empty-state">No assigned PGs.</div>
            }
          </div>
        </section>
      </aside>
    </section>
  </section>
  `,
  styles: [`
    .dashboard { display: flex; flex-direction: column; gap: 20px; }
    .masthead {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 18px;
      flex-wrap: wrap;
    }
    .masthead-copy { max-width: 760px; }
    .crumb, .eyebrow, .section-kicker {
      font-size: 11px;
      color: var(--primary);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
    }
    h1 {
      margin: 6px 0 4px;
      font-size: 34px;
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .sub {
      margin: 0;
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.55;
    }
    .masthead-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .command-band {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.8fr);
      gap: 0;
      border: 1px solid var(--border);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)),
        radial-gradient(circle at top left, rgba(52,211,153,0.12), transparent 34%);
      border-radius: 16px;
      overflow: hidden;
    }
    .command-main {
      padding: 24px 24px 22px;
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .command-topline {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .pg-line {
      color: var(--text-muted);
      font-size: 13px;
    }
    .command-grid {
      display: grid;
      grid-template-columns: 1.05fr 1fr 0.9fr;
      gap: 14px;
      align-items: stretch;
    }
    .command-metric {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    }
    .metric-label, .metric-stack span, .mini-stat span, .tile-label, .ledger-finance span, .pg-totals span {
      font-size: 11px;
      color: var(--text-muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .metric-value {
      font-size: 40px;
      line-height: 0.95;
      font-family: var(--font-mono);
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .metric-note {
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.45;
    }
    .metric-stack {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .metric-stack div {
      display: grid;
      gap: 6px;
    }
    .metric-stack strong {
      font-family: var(--font-mono);
      font-size: 18px;
    }
    .warn { color: var(--status-vacating-text); }
    .progress-track {
      height: 10px;
      background: rgba(255,255,255,0.06);
      border-radius: 999px;
      overflow: hidden;
      margin-top: auto;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #34d399, #60a5fa);
    }
    .command-side {
      padding: 24px 22px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      align-content: start;
      background: rgba(255,255,255,0.015);
    }
    .mini-stat {
      padding: 14px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.02);
      display: grid;
      gap: 8px;
    }
    .mini-stat strong, .tile-value {
      font-family: var(--font-mono);
      font-size: 24px;
      font-weight: 800;
    }

    .summary-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
    .summary-tile {
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px 16px;
      background: rgba(255,255,255,0.02);
      display: grid;
      gap: 8px;
    }

    .workspace {
      display: grid;
      grid-template-columns: minmax(0, 1.18fr) minmax(320px, 0.82fr);
      gap: 16px;
    }
    .workspace-main, .workspace-side {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }
    .workspace-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .surface {
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      background: rgba(255,255,255,0.02);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .surface--hero {
      padding: 20px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.015)),
        linear-gradient(135deg, rgba(96,165,250,0.08), transparent 42%);
    }
    .surface-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .surface-head h2 {
      margin: 4px 0 0;
      font-size: 22px;
      letter-spacing: -0.02em;
    }
    .surface-head a {
      color: var(--primary);
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }

    .ledger-rows, .stack-list, .pg-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ledger-row, .stack-row, .pg-row {
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--bg-elev);
      padding: 14px;
    }
    .ledger-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 14px;
      align-items: center;
    }
    .ledger-identity, .stack-row > div:first-child { min-width: 0; }
    .ledger-title, .stack-title {
      font-size: 14px;
      font-weight: 700;
    }
    .ledger-meta, .stack-meta {
      margin-top: 2px;
      color: var(--text-muted);
      font-size: 12px;
    }
    .ledger-finance {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      min-width: 170px;
    }
    .ledger-finance div {
      display: grid;
      gap: 4px;
      text-align: right;
    }
    .ledger-finance strong {
      font-family: var(--font-mono);
      font-size: 13px;
    }
    .stack-row, .pg-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 14px;
      align-items: center;
    }
    .reads {
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .pg-totals {
      display: grid;
      gap: 6px;
      justify-items: end;
      text-align: right;
    }

    .empty-state {
      padding: 20px;
      border: 1px dashed var(--border);
      border-radius: 12px;
      color: var(--text-muted);
      text-align: center;
      font-size: 13px;
    }

    @media (max-width: 1180px) {
      .command-band, .workspace {
        grid-template-columns: 1fr;
      }
      .command-main {
        border-right: 0;
        border-bottom: 1px solid var(--border);
      }
    }
    @media (max-width: 980px) {
      .command-grid, .workspace-grid, .summary-strip {
        grid-template-columns: 1fr 1fr;
      }
    }
    @media (max-width: 760px) {
      .command-grid, .workspace-grid, .summary-strip, .command-side {
        grid-template-columns: 1fr;
      }
      .ledger-row, .stack-row, .pg-row {
        grid-template-columns: 1fr;
        align-items: start;
      }
      .ledger-finance {
        min-width: 0;
      }
      .ledger-finance div, .pg-totals {
        text-align: left;
        justify-items: start;
      }
    }
  `]
})
export class ManagerDashboardComponent {
  private api = inject(ApiService);

  summary = signal<ManagerSummary | null>(null);
  pgs = signal<PG[]>([]);
  payments = signal<RentRecord[]>([]);
  complaints = signal<Complaint[]>([]);
  notices = signal<Notice[]>([]);
  services = signal<ServiceBooking[]>([]);
  vacates = signal<VacateNotice[]>([]);

  overduePayments = computed(() =>
    this.payments()
      .filter(payment => payment.status === 'OVERDUE')
      .sort((a, b) => b.remainingAmountDue - a.remainingAmountDue)
  );

  pendingPayments = computed(() =>
    this.payments()
      .filter(payment => payment.remainingAmountDue > 0 && payment.status !== 'OVERDUE')
      .sort((a, b) => b.remainingAmountDue - a.remainingAmountDue)
  );

  watchlistPayments = computed(() => [...this.overduePayments(), ...this.pendingPayments()].slice(0, 6));

  activeComplaints = computed(() =>
    this.complaints().filter(item => item.status === 'OPEN' || item.status === 'IN_PROGRESS' || item.status === 'ESCALATED')
  );

  escalatedComplaints = computed(() =>
    this.complaints().filter(item => item.status === 'ESCALATED').length
  );

  complaintQueue = computed(() => this.activeComplaints().slice(0, 5));

  serviceQueue = computed(() =>
    this.services()
      .filter(service => service.status === 'REQUESTED' || service.status === 'CONFIRMED')
      .slice(0, 5)
  );

  totalPending = computed(() =>
    this.payments().reduce((sum, payment) => sum + (payment.remainingAmountDue || 0), 0)
  );

  refundEligibleVacates = computed(() =>
    this.vacates().filter(vacate => !!vacate.refundEligible).length
  );

  attentionCount = computed(() =>
    this.watchlistPayments().length +
    this.activeComplaints().length +
    this.serviceQueue().length +
    this.vacates().length
  );

  assignedPgNames = computed(() => {
    const names = this.pgs().map(pg => pg.name);
    if (!names.length) return 'No assigned PGs';
    if (names.length <= 2) return names.join(' • ');
    return `${names.slice(0, 2).join(' • ')} +${names.length - 2} more`;
  });

  constructor() {
    this.api.managerSummary().subscribe({ next: value => this.summary.set(value) });
    this.api.listPgs().subscribe({ next: value => this.pgs.set(value) });
    this.api.listPayments().subscribe({ next: value => this.payments.set(value) });
    this.api.listComplaints().subscribe({ next: value => this.complaints.set(value) });
    this.api.listNotices().subscribe({ next: value => this.notices.set(value.slice(0, 5)) });
    this.api.listServices().subscribe({ next: value => this.services.set(value) });
    this.api.listVacates().subscribe({ next: value => this.vacates.set(value) });
  }

  money(value: number): string {
    return `₹${value.toLocaleString('en-IN')}`;
  }

  statusClass(status: string | undefined): string {
    return `pill--${String(status || '').toLowerCase()}`;
  }

  paymentBadge(payment: RentRecord): string {
    if (payment.status === 'OVERDUE') return 'pill--overdue';
    if (payment.remainingAmountDue > 0) return 'pill--pending';
    return this.statusClass(payment.status);
  }

  vacateBadgeClass(vacate: VacateNotice): string {
    if (vacate.refundEligible) return 'pill--approved';
    if (vacate.referralName) return 'pill--partial';
    return 'pill--pending';
  }

  vacateBadgeLabel(vacate: VacateNotice): string {
    if (vacate.refundEligible) return 'Refund eligible';
    if (vacate.referralName) return 'Referral';
    return 'Pending';
  }
}
