import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ServiceBooking, ServiceStatus } from '../../core/models';
import { DisplayDatePipe } from '../../shared/display-date.pipe';

type DeskFilter = 'ALL' | 'REQUESTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

@Component({
  selector: 'app-service-desk',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DisplayDatePipe],
  template: `
    <section class="service-desk fade-up" [class.service-desk--owner]="role() === 'OWNER'">
      <header class="masthead surface">
        <div class="masthead-copy">
          <div class="crumb">Service Desk</div>
          <div class="role-pill">{{ role() === 'OWNER' ? 'Owner visibility' : 'Manager control' }}</div>
          <h1>{{ role() === 'OWNER' ? 'Service oversight' : 'Service operations' }}</h1>
          <p class="sub">
            {{ role() === 'OWNER'
              ? 'Monitor every request, spot delays, and step in where manager operations need support.'
              : 'Run housekeeping and maintenance requests with clear scheduling, updates, and closure notes.' }}
          </p>
        </div>
        <div class="masthead-actions">
          <button class="btn btn--ghost" type="button" (click)="load()">
            <mat-icon>refresh</mat-icon>
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <section class="summary-grid">
        <article class="summary-card summary-card--active">
          <span class="summary-label">Open queue</span>
          <strong class="summary-value">{{ activeCount() }}</strong>
          <small class="summary-meta">{{ requestedCount() }} requested · {{ inProgressCount() }} in progress</small>
        </article>
        <article class="summary-card">
          <span class="summary-label">Today</span>
          <strong class="summary-value">{{ todayCount() }}</strong>
          <small class="summary-meta">Services scheduled for today</small>
        </article>
        <article class="summary-card">
          <span class="summary-label">Completed</span>
          <strong class="summary-value">{{ completedCount() }}</strong>
          <small class="summary-meta">Closed requests</small>
        </article>
        <article class="summary-card summary-card--danger">
          <span class="summary-label">Rejected</span>
          <strong class="summary-value">{{ rejectedCount() }}</strong>
          <small class="summary-meta">Requests declined</small>
        </article>
      </section>

      <div class="toolbar">
        <div class="search">
          <mat-icon>search</mat-icon>
          <input [(ngModel)]="query" name="query" placeholder="Search tenant, PG, room, notes" />
        </div>
        <div class="filters">
          @for (item of filters; track item) {
            <button class="chip" type="button" [class.chip--active]="statusFilter() === item" (click)="statusFilter.set(item)">
              {{ filterLabel(item) }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="state surface">
          <div class="spinner"></div>
          <span>Loading services...</span>
        </div>
      } @else if (error()) {
        <div class="state surface state--error">
          <mat-icon>error</mat-icon>
          <span>{{ error() }}</span>
        </div>
      } @else if (!filteredRows().length) {
        <div class="state surface">
          <mat-icon>inbox</mat-icon>
          <span>No service requests match this view.</span>
        </div>
      } @else {
        <div class="workspace">
          <section class="queue surface">
            <div class="section-head">
              <div>
                <div class="section-kicker">Dispatch Board</div>
                <h2>{{ filterLabel(statusFilter()) }} requests</h2>
              </div>
              <div class="section-meta">{{ filteredRows().length }} item{{ filteredRows().length === 1 ? '' : 's' }}</div>
            </div>

            <div class="list">
              @for (service of filteredRows(); track service.id) {
                <button class="row" type="button" [class.row--active]="selected()?.id === service.id" (click)="selected.set(service)">
                  <div class="row-main">
                    <div class="row-title">
                      <strong>{{ serviceLabel(service.serviceType) }}</strong>
                      <span class="pill dot" [ngClass]="statusClass(service.status)">{{ service.status }}</span>
                    </div>
                    <div class="row-meta">{{ service.tenantName || 'Tenant' }} · {{ service.pgName || '-' }} · Room {{ service.roomNumber || '-' }}</div>
                    <div class="row-meta">{{ service.preferredDate | displayDate }} · {{ service.preferredTimeWindow || 'Flexible' }}</div>
                    <p class="row-note">{{ service.requestNotes || service.managerNotes || 'No service details added yet.' }}</p>
                  </div>
                  <div class="row-side">
                    <div class="queue-flag" [class.queue-flag--hot]="service.status === 'REQUESTED' || service.status === 'IN_PROGRESS'">
                      {{ queueFlag(service) }}
                    </div>
                    @if (service.rating) {
                      <div class="rating">{{ service.rating }}/5</div>
                    }
                    <div class="stamp">{{ timelineStamp(service) }}</div>
                  </div>
                </button>
              }
            </div>
          </section>

          <aside class="detail surface">
            @if (selected(); as service) {
              <div class="detail-head">
                <div>
                  <div class="section-kicker">Details</div>
                  <h2>{{ serviceLabel(service.serviceType) }}</h2>
                  <p class="detail-sub">{{ service.tenantName || 'Tenant' }} · {{ service.pgName || '-' }} · Room {{ service.roomNumber || '-' }}</p>
                </div>
                <span class="pill dot" [ngClass]="statusClass(service.status)">{{ service.status }}</span>
              </div>

              <div class="metrics">
                <div><span>Date</span><strong>{{ service.preferredDate | displayDate }}</strong></div>
                <div><span>Window</span><strong>{{ service.preferredTimeWindow || 'Flexible' }}</strong></div>
                <div><span>Requested</span><strong>{{ service.createdAt | displayDate:'datetime' }}</strong></div>
                <div><span>Last update</span><strong>{{ (service.updatedAt || service.createdAt) | displayDate:'datetime' }}</strong></div>
              </div>

              <div class="timeline">
                <div class="timeline-head">Lifecycle</div>
                <div class="timeline-list">
                  @for (item of lifecycle(service); track item.label) {
                    <div class="timeline-row" [class.timeline-row--done]="!!item.at">
                      <span class="timeline-dot"></span>
                      <div class="timeline-copy">
                        <strong>{{ item.label }}</strong>
                        <small>{{ item.at ? item.at : 'Not reached yet' }}</small>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="note-block">
                <div class="note-label">Tenant request</div>
                <p>{{ service.requestNotes || 'No request note provided.' }}</p>
              </div>

              <div class="note-block">
                <div class="note-label">Operations note</div>
                <p>{{ service.managerNotes || 'No manager note recorded yet.' }}</p>
              </div>

              @if (service.rating) {
                <div class="note-block">
                  <div class="note-label">Tenant feedback</div>
                  <p>{{ service.rating }}/5{{ service.ratingComment ? ' · ' + service.ratingComment : '' }}</p>
                </div>
              }

              <div class="actions">
                @if (canAct(service, 'CONFIRMED')) {
                  <button class="btn btn--primary" type="button" (click)="updateServiceStatus(service, 'CONFIRMED')">
                    <mat-icon>event_available</mat-icon>
                    <span>Confirm</span>
                  </button>
                }
                @if (canAct(service, 'IN_PROGRESS')) {
                  <button class="btn btn--primary" type="button" (click)="updateServiceStatus(service, 'IN_PROGRESS')">
                    <mat-icon>play_circle</mat-icon>
                    <span>Start</span>
                  </button>
                }
                @if (canAct(service, 'COMPLETED')) {
                  <button class="btn btn--primary" type="button" (click)="updateServiceStatus(service, 'COMPLETED')">
                    <mat-icon>task_alt</mat-icon>
                    <span>Complete</span>
                  </button>
                }
                @if (canAct(service, 'REJECTED')) {
                  <button class="btn btn--danger" type="button" (click)="updateServiceStatus(service, 'REJECTED')">
                    <mat-icon>cancel</mat-icon>
                    <span>Reject</span>
                  </button>
                }
              </div>
            } @else {
              <div class="state state--inline">
                <mat-icon>assignment</mat-icon>
                <span>Select a request to inspect and act on it.</span>
              </div>
            }
          </aside>
        </div>
      }
    </section>

  `,
  styles: [`
    .service-desk { display: flex; flex-direction: column; gap: 18px; }
    .masthead { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
    .masthead-copy { display: grid; gap: 10px; max-width: 760px; }
    .masthead-actions { display: flex; align-items: flex-start; }
    .crumb, .section-kicker { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    .role-pill { width: fit-content; padding: 6px 10px; border-radius: 999px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25); color: var(--text); font-size: 12px; font-weight: 600; }
    .sub { color: var(--text-muted); max-width: 760px; line-height: 1.6; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(180px, 1fr)); gap: 12px; }
    .summary-card, .surface { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
    .summary-card--active { border-color: rgba(99,102,241,0.28); box-shadow: inset 0 0 0 1px rgba(99,102,241,0.12); }
    .summary-card--danger { border-color: rgba(248,113,113,0.28); }
    .summary-label { color: var(--text-muted); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }
    .summary-value { font-size: 30px; display: block; margin-top: 6px; }
    .summary-meta, .section-meta { color: var(--text-muted); font-size: 12px; }
    .toolbar { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; }
    .search { display: flex; align-items: center; gap: 8px; min-width: 300px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 0 12px; }
    .search input { border: 0; background: transparent; padding: 11px 0; color: var(--text); width: 100%; }
    .filters { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip { border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); border-radius: 999px; padding: 8px 12px; cursor: pointer; }
    .chip--active { color: var(--text); border-color: var(--primary); background: rgba(99,102,241,0.12); }
    .workspace { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr); gap: 16px; }
    .section-head, .detail-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .list { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
    .row { width: 100%; text-align: left; display: flex; justify-content: space-between; gap: 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); padding: 14px; cursor: pointer; position: relative; overflow: hidden; color: var(--text); }
    .row::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 4px; background: transparent; }
    .row--active { border-color: var(--primary); box-shadow: inset 0 0 0 1px rgba(99,102,241,0.18); }
    .row--active::before { background: var(--primary); }
    .row-main { display: grid; gap: 6px; min-width: 0; }
    .row-title { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .row-title strong { color: var(--text); }
    .row-meta, .stamp, .detail-sub, .note-label { color: var(--text-muted); font-size: 12px; }
    .row-note, .note-block p { margin: 0; line-height: 1.5; color: var(--text); }
    .service-desk--owner .row,
    .service-desk--owner .row-title strong,
    .service-desk--owner .row-note { color: #f8fafc; }
    .service-desk--owner .row-meta,
    .service-desk--owner .queue-flag,
    .service-desk--owner .stamp { color: rgba(226,232,240,0.82); }
    .service-desk--owner .queue-flag--hot { color: #a5b4fc; }
    .row-side { display: grid; justify-items: end; align-content: space-between; gap: 8px; text-align: right; }
    .queue-flag { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
    .queue-flag--hot { color: var(--primary); }
    .rating { font-weight: 700; color: var(--warning, #fbbf24); }
    .metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
    .metrics div { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 12px; display: grid; gap: 4px; }
    .metrics span { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
    .timeline { margin-top: 14px; padding: 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; }
    .timeline-head { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
    .timeline-list { display: grid; gap: 10px; }
    .timeline-row { display: flex; gap: 10px; align-items: flex-start; }
    .timeline-dot { width: 10px; height: 10px; margin-top: 4px; border-radius: 999px; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.2); }
    .timeline-row--done .timeline-dot { background: var(--primary); border-color: var(--primary); }
    .timeline-copy { display: grid; gap: 2px; }
    .timeline-copy small { color: var(--text-muted); font-size: 12px; }
    .note-block { margin-top: 14px; padding: 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
    .state { min-height: 180px; display: grid; place-items: center; gap: 10px; color: var(--text-muted); text-align: center; }
    .state--error { color: var(--danger); }
    .state--inline { min-height: 280px; }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.9s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 1100px) {
      .masthead { flex-direction: column; }
      .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .workspace { grid-template-columns: 1fr; }
    }
    @media (max-width: 720px) {
      .summary-grid, .metrics { grid-template-columns: 1fr; }
    }
  `]
})
export class ServiceDeskComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  readonly filters: DeskFilter[] = ['ALL', 'REQUESTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];

  rows = signal<ServiceBooking[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  selected = signal<ServiceBooking | null>(null);
  statusFilter = signal<DeskFilter>('ALL');
  query = '';

  role = this.auth.role;
  filteredRows = computed(() => {
    const filter = this.statusFilter();
    const q = this.query.toLowerCase().trim();
    return this.rows().filter(item => {
      const matchesFilter = filter === 'ALL' ? true : item.status === filter;
      if (!matchesFilter) return false;
      if (!q) return true;
      return JSON.stringify(item).toLowerCase().includes(q);
    });
  });

  requestedCount = computed(() => this.rows().filter(item => item.status === 'REQUESTED').length);
  inProgressCount = computed(() => this.rows().filter(item => item.status === 'IN_PROGRESS').length);
  activeCount = computed(() => this.rows().filter(item => ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'].includes(item.status)).length);
  completedCount = computed(() => this.rows().filter(item => item.status === 'COMPLETED').length);
  rejectedCount = computed(() => this.rows().filter(item => item.status === 'REJECTED').length);
  todayCount = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.rows().filter(item => item.preferredDate === today).length;
  });

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.listServices().subscribe({
      next: rows => {
        this.rows.set(rows);
        const current = this.selected();
        this.selected.set(current ? rows.find(item => item.id === current.id) || rows[0] || null : rows[0] || null);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.message || 'Could not load service requests');
      }
    });
  }

  filterLabel(filter: DeskFilter): string {
    return filter === 'ALL' ? 'All' : this.pretty(filter);
  }

  serviceLabel(value: string | undefined): string {
    const labels: Record<string, string> = {
      CLEANING: 'Room cleaning',
      LINEN_CHANGE: 'Linen change',
      PEST_CONTROL: 'Pest control',
      PLUMBING: 'Plumbing',
      ELECTRICAL: 'Electrical'
    };
    return labels[String(value || '')] || String(value || 'Service');
  }

  statusClass(status: string | undefined): string {
    return `pill--${String(status || '').toLowerCase()}`;
  }

  timelineStamp(service: ServiceBooking): string {
    if (service.completedAt) return 'Completed';
    if (service.startedAt) return 'In progress';
    if (service.confirmedAt) return 'Confirmed';
    if (service.rejectedAt) return 'Rejected';
    return 'Requested';
  }

  queueFlag(service: ServiceBooking): string {
    if (service.status === 'REQUESTED') return 'Needs triage';
    if (service.status === 'IN_PROGRESS') return 'Live work';
    if (service.status === 'CONFIRMED') return 'Scheduled';
    if (service.status === 'COMPLETED') return 'Closed';
    return 'Declined';
  }

  lifecycle(service: ServiceBooking): Array<{ label: string; at: string | undefined }> {
    return [
      { label: 'Requested', at: service.createdAt },
      { label: 'Confirmed', at: service.confirmedAt },
      { label: 'In progress', at: service.startedAt },
      { label: 'Completed', at: service.completedAt || service.rejectedAt }
    ];
  }

  canAct(service: ServiceBooking, next: ServiceStatus): boolean {
    if (service.status === 'REQUESTED') return next === 'CONFIRMED' || next === 'REJECTED';
    if (service.status === 'CONFIRMED') return next === 'IN_PROGRESS' || next === 'REJECTED';
    if (service.status === 'IN_PROGRESS') return next === 'COMPLETED';
    return false;
  }

  updateServiceStatus(service: ServiceBooking, status: ServiceStatus) {
    this.api.updateService(service.id, status).subscribe({
      next: updated => {
        this.rows.set(this.rows().map(item => item.id === updated.id ? updated : item));
        this.selected.set(updated);
        this.snack.open('Service updated', 'OK', { duration: 1800, panelClass: 'pgms-snack' });
      },
      error: err => this.snack.open(err?.message || 'Could not update service', 'Dismiss', { duration: 2800, panelClass: 'pgms-snack' })
    });
  }

  private pretty(value: string): string {
    return value.toLowerCase().split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
}
