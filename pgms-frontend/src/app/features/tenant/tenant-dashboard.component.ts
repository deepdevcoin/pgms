import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AmenityBooking, Complaint, MenuItem, Notice, RentRecord, ServiceBooking, Tenant, VacateNotice } from '../../core/models';

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
  <section class="tenant-dashboard fade-up" data-testid="tenant-dashboard">
    <header class="hero surface">
      <div class="hero-copy">
        <div class="eyebrow">Resident Hub</div>
        <h1>{{ greeting() }}, {{ firstName() }}</h1>
        <p class="hero-sub">Everything for your stay in one place: room details, dues, notices, services, amenities, and today's meals.</p>

        <div class="hero-chips">
          <div class="chip">
            <span>PG</span>
            <strong>{{ profile()?.pgName || 'Assigned PG' }}</strong>
          </div>
          <div class="chip">
            <span>Room</span>
            <strong>{{ profile()?.roomNumber || fallbackRoom() }}</strong>
          </div>
          <div class="chip">
            <span>Status</span>
            <strong>{{ profile()?.status || 'ACTIVE' }}</strong>
          </div>
          <div class="chip">
            <span>Joined</span>
            <strong>{{ profile()?.joiningDate || '-' }}</strong>
          </div>
        </div>

        <div class="hero-actions">
          <a class="btn btn--primary" routerLink="/tenant/payments">
            <mat-icon>payments</mat-icon>
            <span>{{ currentRent() ? 'Pay rent' : 'Open payments' }}</span>
          </a>
          <a class="btn btn--ghost" routerLink="/tenant/complaints">
            <mat-icon>campaign</mat-icon>
            <span>Raise complaint</span>
          </a>
        </div>
      </div>
    </header>

    <section class="metrics-grid">
      <article class="metric-card emphasis">
        <span class="metric-label">Pending due</span>
        <strong class="metric-value">{{ money(currentRent() ? currentRent()!.remainingAmountDue : 0) }}</strong>
        <p class="metric-meta">
          @if (currentRent()) {
            {{ currentRent()!.billingMonth }} · {{ currentRent()!.status }} · Due {{ currentRent()!.dueDate || 'this cycle' }}
          } @else {
            No active dues right now
          }
        </p>
      </article>

      <article class="metric-card">
        <span class="metric-label">Wallet credit</span>
        <strong class="metric-value">{{ money(profile()?.creditWalletBalance || 0) }}</strong>
        <p class="metric-meta">Use it fully or partially against your rent.</p>
      </article>

      <article class="metric-card">
        <span class="metric-label">Advance paid</span>
        <strong class="metric-value">{{ money(profile()?.advanceAmountPaid || 0) }}</strong>
        <p class="metric-meta">Security deposit currently on file.</p>
      </article>

      <article class="metric-card">
        <span class="metric-label">Attention items</span>
        <strong class="metric-value">{{ attentionCount() }}</strong>
        <p class="metric-meta">{{ unreadNoticeCount() }} unread notices, {{ openComplaintCount() }} active complaints, {{ activeServiceCount() }} active services.</p>
      </article>
    </section>

    <section class="dashboard-grid">
      <div class="main-column">
        <section class="surface">
          <div class="section-head">
            <div>
              <div class="eyebrow">Profile</div>
              <h2>Stay summary</h2>
            </div>
          </div>

          <div class="details-grid">
            <div class="detail-tile">
              <span>Name</span>
              <strong>{{ profile()?.name || '-' }}</strong>
            </div>
            <div class="detail-tile">
              <span>Email</span>
              <strong>{{ profile()?.email || '-' }}</strong>
            </div>
            <div class="detail-tile">
              <span>Phone</span>
              <strong>{{ profile()?.phone || '-' }}</strong>
            </div>
            <div class="detail-tile">
              <span>KYC</span>
              <strong>{{ profile()?.kycDocType || 'Pending' }}</strong>
            </div>
            <div class="detail-tile">
              <span>PG</span>
              <strong>{{ profile()?.pgName || '-' }}</strong>
            </div>
            <div class="detail-tile">
              <span>Room</span>
              <strong>{{ profile()?.roomNumber || fallbackRoom() }}</strong>
            </div>
            <div class="detail-tile">
              <span>Status</span>
              <strong>{{ profile()?.status || 'ACTIVE' }}</strong>
            </div>
            <div class="detail-tile">
              <span>Joined</span>
              <strong>{{ profile()?.joiningDate || '-' }}</strong>
            </div>
          </div>
        </section>

        <section class="surface finance-surface">
          <div class="section-head">
            <div>
              <div class="eyebrow">Payments</div>
              <h2>Current rent snapshot</h2>
            </div>
            <a routerLink="/tenant/payments">Open payments</a>
          </div>

          @if (currentRent()) {
            <div class="finance-grid">
              <div class="finance-focus">
                <span>Pending now</span>
                <strong>{{ money(currentRent()!.remainingAmountDue) }}</strong>
                <small>{{ currentRent()!.billingMonth }} billing cycle</small>
              </div>
              <div class="finance-stats">
                <div class="finance-tile">
                  <span>Rent</span>
                  <strong>{{ money(currentRent()!.rentAmount) }}</strong>
                </div>
                <div class="finance-tile">
                  <span>Paid</span>
                  <strong>{{ money(currentRent()!.amountPaid) }}</strong>
                </div>
                <div class="finance-tile">
                  <span>Fine</span>
                  <strong>{{ money(currentRent()!.fineAccrued) }}</strong>
                </div>
                <div class="finance-tile">
                  <span>Total due</span>
                  <strong>{{ money(currentRent()!.totalDue) }}</strong>
                </div>
                <div class="finance-tile">
                  <span>Due date</span>
                  <strong>{{ currentRent()!.dueDate || '-' }}</strong>
                </div>
                <div class="finance-tile">
                  <span>Status</span>
                  <strong>{{ currentRent()!.status }}</strong>
                </div>
              </div>
            </div>
          } @else {
            <div class="empty-state">You're clear for the current cycle. Open payments to review history and transactions.</div>
          }
        </section>

        <section class="surface">
          <div class="section-head">
            <div>
              <div class="eyebrow">Food</div>
              <h2>Today's menu</h2>
            </div>
            <a routerLink="/tenant/menu">Open menu</a>
          </div>

          @if (todayMenu().length) {
            <div class="today-menu-grid">
              @for (meal of todayMenu(); track mealTrack(meal)) {
                <article class="menu-card">
                  <div class="menu-top">
                    <strong>{{ meal.mealType }}</strong>
                    <span class="food-tag" [class.food-tag--veg]="meal.isVeg">{{ meal.isVeg ? 'Veg' : 'Mixed' }}</span>
                  </div>
                  <p>{{ meal.itemNames }}</p>
                </article>
              }
            </div>
          } @else {
            <div class="empty-state">Menu is not available for today yet.</div>
          }
        </section>

        <section class="split-grid">
          <section class="surface">
            <div class="section-head">
              <div>
                <div class="eyebrow">Requests</div>
                <h2>My complaints</h2>
              </div>
              <a routerLink="/tenant/complaints">Open complaints</a>
            </div>
            <div class="list-stack">
              @for (complaint of recentComplaints(); track complaint.id) {
                <article class="list-row">
                  <div class="list-copy">
                    <strong>{{ complaint.category }}</strong>
                    <p>{{ complaint.description }}</p>
                    <div class="row-meta">{{ complaint.createdAt | date:'mediumDate' }} · {{ complaint.roomNumber || 'My room' }}</div>
                  </div>
                  <span class="pill dot" [ngClass]="statusClass(complaint.status)">{{ complaint.status }}</span>
                </article>
              } @empty {
                <div class="empty-state">No complaints raised recently.</div>
              }
            </div>
          </section>

          <section class="surface">
            <div class="section-head">
              <div>
                <div class="eyebrow">Housekeeping</div>
                <h2>Service requests</h2>
              </div>
              <a routerLink="/tenant/services">Open services</a>
            </div>
            <div class="list-stack">
              @for (service of activeServices(); track service.id) {
                <article class="list-row">
                  <div class="list-copy">
                    <strong>{{ service.serviceType }}</strong>
                    <p>{{ service.notes || 'Preferred time captured for this request.' }}</p>
                    <div class="row-meta">{{ service.preferredDate }} · {{ service.preferredTimeWindow || 'Flexible timing' }}</div>
                  </div>
                  <span class="pill dot" [ngClass]="statusClass(service.status)">{{ service.status }}</span>
                </article>
              } @empty {
                <div class="empty-state">No active service requests.</div>
              }
            </div>
          </section>
        </section>
      </div>

      <aside class="side-column">
        <section class="surface">
          <div class="section-head">
            <div>
              <div class="eyebrow">Communication</div>
              <h2>Recent notices</h2>
            </div>
            <a routerLink="/tenant/notices">Open notices</a>
          </div>
          <div class="list-stack">
            @for (notice of recentNotices(); track notice.id) {
              <article class="list-row compact">
                <div class="list-copy">
                  <strong>{{ notice.title }}</strong>
                  <p>{{ notice.content }}</p>
                  <div class="row-meta">{{ notice.createdByName || 'Management' }} · {{ notice.createdAt | date:'mediumDate' }}</div>
                </div>
                <span class="pill dot" [class.pill--approved]="notice.read" [class.pill--pending]="!notice.read">
                  {{ notice.read ? 'Read' : 'New' }}
                </span>
              </article>
            } @empty {
              <div class="empty-state">No notices right now.</div>
            }
          </div>
        </section>

        <section class="surface">
          <div class="section-head">
            <div>
              <div class="eyebrow">Amenities</div>
              <h2>Next bookable slots</h2>
            </div>
            <a routerLink="/tenant/amenities">Open amenities</a>
          </div>
          <div class="list-stack">
            @for (slot of nextAmenities(); track slot.slotId + '-' + slot.startTime) {
              <article class="list-row compact">
                <div class="list-copy">
                  <strong>{{ slot.facilityName || slot.amenityType }}</strong>
                  <p>{{ slot.slotDate }} · {{ slot.startTime }} to {{ slot.endTime }}</p>
                  <div class="row-meta">{{ slot.bookingCount || 0 }}/{{ slot.capacity }} booked</div>
                </div>
                <span class="slot-pill">{{ slot.openInvite ? 'Open invite' : 'Bookable' }}</span>
              </article>
            } @empty {
              <div class="empty-state">No upcoming amenity slots visible yet.</div>
            }
          </div>
        </section>

        <section class="surface">
          <div class="section-head">
            <div>
              <div class="eyebrow">Move-out</div>
              <h2>Vacate status</h2>
            </div>
            <a routerLink="/tenant/vacate">Open vacate</a>
          </div>
          @if (currentVacate()) {
            <div class="vacate-card">
              <strong>{{ currentVacate()!.status }}</strong>
              <p class="vacate-meta">Intended vacate {{ currentVacate()!.intendedVacateDate }}</p>
              <div class="vacate-grid">
                <div class="detail-tile">
                  <span>Refund</span>
                  <strong>{{ currentVacate()!.refundEligible ? 'Eligible' : 'TBD' }}</strong>
                </div>
                <div class="detail-tile">
                  <span>Referral</span>
                  <strong>{{ currentVacate()!.referralName || 'None' }}</strong>
                </div>
              </div>
            </div>
          } @else {
            <div class="empty-state">No active vacate request.</div>
          }
        </section>
      </aside>
    </section>
  </section>
  `,
  styles: [`
    .tenant-dashboard {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .surface {
      border: 1px solid var(--border);
      border-radius: 16px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.015));
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }

    .hero {
      display: block;
    }

    .hero-copy {
      max-width: none;
      display: grid;
      gap: 14px;
    }

    .eyebrow {
      font-size: 11px;
      color: var(--primary);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
    }

    h1 {
      margin: 0;
      font-size: 34px;
      line-height: 1;
      letter-spacing: -0.03em;
    }

    h2 {
      margin: 4px 0 0;
      font-size: 22px;
      letter-spacing: -0.02em;
    }

    .hero-sub,
    .metric-meta,
    .row-meta,
    .list-copy p,
    .empty-state,
    .vacate-meta {
      margin: 0;
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.5;
    }

    .hero-chips {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .chip,
    .detail-tile,
    .finance-tile,
    .metric-card,
    .menu-card {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: rgba(255,255,255,0.03);
    }

    .chip {
      min-width: 134px;
      padding: 10px 12px;
      display: grid;
      gap: 4px;
    }

    .chip span,
    .metric-label,
    .detail-tile span,
    .finance-tile span,
    .finance-focus span {
      font-size: 11px;
      color: var(--text-muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .chip strong,
    .detail-tile strong,
    .finance-tile strong {
      font-size: 14px;
      font-weight: 700;
    }

    .hero-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .metric-card {
      padding: 18px;
      display: grid;
      gap: 8px;
      min-height: 142px;
    }

    .metric-card.emphasis {
      background:
        linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)),
        linear-gradient(135deg, rgba(96,165,250,0.12), transparent 48%);
    }

    .metric-value,
    .finance-focus strong {
      font-size: 30px;
      line-height: 1;
      font-weight: 800;
      font-family: var(--font-mono);
      letter-spacing: -0.03em;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.85fr);
      gap: 16px;
    }

    .main-column,
    .side-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .section-head a {
      color: var(--primary);
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .detail-tile,
    .finance-tile {
      padding: 14px;
      display: grid;
      gap: 4px;
    }

    .finance-surface {
      background:
        linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015)),
        linear-gradient(135deg, rgba(96,165,250,0.09), transparent 42%);
    }

    .finance-grid {
      display: grid;
      grid-template-columns: minmax(220px, 0.82fr) 1fr;
      gap: 14px;
    }

    .finance-focus {
      padding: 18px;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      background: rgba(255,255,255,0.035);
      display: grid;
      gap: 8px;
      align-content: start;
    }

    .finance-focus small {
      color: var(--text-muted);
      font-size: 12px;
    }

    .finance-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .split-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .today-menu-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .menu-card {
      padding: 16px;
      display: grid;
      gap: 10px;
    }

    .menu-top {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
    }

    .menu-card p {
      margin: 0;
      line-height: 1.45;
      color: var(--text);
    }

    .food-tag,
    .slot-pill {
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      background: rgba(255,255,255,0.06);
      color: var(--text-muted);
    }

    .food-tag--veg {
      background: rgba(34,197,94,0.12);
      color: #86efac;
    }

    .list-stack {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .list-row {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--bg-elev);
      padding: 14px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 14px;
      align-items: start;
    }

    .list-row.compact {
      gap: 10px;
    }

    .list-copy {
      display: grid;
      gap: 6px;
      min-width: 0;
    }

    .list-copy strong {
      font-size: 14px;
      font-weight: 700;
    }

    .empty-state {
      padding: 18px;
      border: 1px dashed var(--border);
      border-radius: 14px;
      text-align: center;
    }

    .vacate-card {
      display: grid;
      gap: 12px;
    }

    .vacate-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    @media (max-width: 1240px) {
      .metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 980px) {
      .details-grid,
      .finance-stats,
      .today-menu-grid,
      .split-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .finance-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      h1 {
        font-size: 28px;
      }

      .metrics-grid,
      .details-grid,
      .finance-stats,
      .today-menu-grid,
      .split-grid,
      .vacate-grid {
        grid-template-columns: 1fr;
      }

      .list-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TenantDashboardComponent {
  private api = inject(ApiService);

  profile = signal<Tenant | null>(null);
  payments = signal<RentRecord[]>([]);
  complaints = signal<Complaint[]>([]);
  notices = signal<Notice[]>([]);
  services = signal<ServiceBooking[]>([]);
  vacates = signal<VacateNotice[]>([]);
  amenities = signal<AmenityBooking[]>([]);
  menu = signal<MenuItem[]>([]);

  currentRent = computed(() => {
    const records = [...this.payments()].sort((a, b) => String(b.billingMonth).localeCompare(String(a.billingMonth)));
    return records.find(record => record.remainingAmountDue > 0) || records[0] || null;
  });

  recentComplaints = computed(() => this.complaints().slice(0, 4));
  recentNotices = computed(() => this.notices().slice(0, 4));
  activeServices = computed(() => this.services().filter(item => item.status !== 'COMPLETED').slice(0, 4));
  currentVacate = computed(() => this.vacates()[0] || null);
  nextAmenities = computed(() =>
    [...this.amenities()]
      .sort((a, b) => `${a.slotDate} ${a.startTime}`.localeCompare(`${b.slotDate} ${b.startTime}`))
      .slice(0, 4)
  );

  openComplaintCount = computed(() => this.complaints().filter(item => item.status !== 'RESOLVED' && item.status !== 'CLOSED').length);
  activeServiceCount = computed(() => this.services().filter(item => item.status !== 'COMPLETED' && item.status !== 'REJECTED').length);
  unreadNoticeCount = computed(() => this.notices().filter(item => !item.read).length);
  attentionCount = computed(() => this.openComplaintCount() + this.activeServiceCount() + this.unreadNoticeCount());

  todayMenu = computed(() => {
    const today = this.dayName();
    const order: Record<string, number> = { BREAKFAST: 0, LUNCH: 1, DINNER: 2 };
    return this.menu()
      .filter(item => item.dayOfWeek === today)
      .sort((a, b) => (order[a.mealType] ?? 9) - (order[b.mealType] ?? 9));
  });

  firstName = computed(() => (this.profile()?.name || 'there').split(' ')[0]);
  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });

  constructor() {
    this.api.tenantProfile().subscribe({
      next: value => {
        this.profile.set(value);
        if (value.pgId) {
          this.api.listMenu(value.pgId, this.weekLabel()).subscribe({ next: items => this.menu.set(items), error: () => this.menu.set([]) });
        }
      }
    });
    this.api.listPayments().subscribe({ next: value => this.payments.set(value) });
    this.api.listComplaints().subscribe({ next: value => this.complaints.set(value) });
    this.api.listNotices().subscribe({ next: value => this.notices.set(value) });
    this.api.listServices().subscribe({ next: value => this.services.set(value) });
    this.api.listVacates().subscribe({ next: value => this.vacates.set(value) });
    this.api.listAmenities().subscribe({ next: value => this.amenities.set(value) });
  }

  money(value: number): string {
    return `₹${value.toLocaleString('en-IN')}`;
  }

  statusClass(status: string | undefined): string {
    return `pill--${String(status || '').toLowerCase()}`;
  }

  fallbackRoom(): string {
    return this.profile()?.roomId ? `#${this.profile()!.roomId}` : '-';
  }

  mealTrack(item: MenuItem): string {
    return `${item.dayOfWeek}-${item.mealType}-${item.itemNames}`;
  }

  private weekLabel(): string {
    const date = new Date();
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  private dayName(): string {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()).toUpperCase();
  }
}
