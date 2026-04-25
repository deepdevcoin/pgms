import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { PG, RentRecord, Room, Tenant } from '../../core/models';

interface TenantFinanceView extends Tenant {
  monthlyRent: number;
  depositAmount: number;
  advanceDue: number;
  currentBillingMonth: string;
  currentRentPaid: number;
  currentRentDue: number;
  currentFine: number;
  totalRentPaid: number;
  totalRentOutstanding: number;
  overdueRecords: number;
}

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
  <section class="fade-up tenants">
    <header class="head">
      <div>
        <div class="crumb">People</div>
        <h1>Tenants</h1>
        <p class="sub">{{ subtitle() }}</p>
      </div>
      @if (canOnboard()) {
        <button class="btn btn--primary" (click)="showForm.set(!showForm())">
          <mat-icon>{{ showForm() ? 'close' : 'person_add' }}</mat-icon>
          <span>{{ showForm() ? 'Close' : 'Onboard tenant' }}</span>
        </button>
      }
    </header>

    @if (canOnboard() && showForm()) {
      <form class="form card" (ngSubmit)="createTenant()">
        <label class="fld"><span>Name</span><input [(ngModel)]="form.name" name="name" required /></label>
        <label class="fld"><span>Email</span><input [(ngModel)]="form.email" name="email" type="email" required /></label>
        <label class="fld"><span>Phone</span><input [(ngModel)]="form.phone" name="phone" required /></label>
        <label class="fld"><span>Joining date</span><input [(ngModel)]="form.joiningDate" name="joiningDate" type="date" required /></label>
        <label class="fld"><span>Advance paid</span><input [(ngModel)]="form.advanceAmountPaid" name="advanceAmountPaid" type="number" required /></label>
        <label class="fld"><span>PG</span>
          <select [(ngModel)]="selectedPgId" name="pg" (ngModelChange)="loadRooms($event)">
            @for (pg of pgs(); track pg.id) { <option [ngValue]="pg.id">{{ pg.name }}</option> }
          </select>
        </label>
        <label class="fld wide"><span>Vacant room</span>
          <select [(ngModel)]="form.roomId" name="roomId" required>
            @for (room of vacantRooms(); track room.id) {
              <option [ngValue]="room.id">{{ room.roomNumber }} · Floor {{ room.floor }} · {{ room.sharingType }} · {{ money(room.monthlyRent) }}</option>
            }
          </select>
        </label>
        <button class="btn btn--primary" type="submit" [disabled]="saving()">
          <mat-icon>check</mat-icon>
          <span>{{ saving() ? 'Saving...' : 'Create tenant' }}</span>
        </button>
      </form>
    }

    <div class="toolbar">
      <div class="search"><mat-icon>search</mat-icon><input [(ngModel)]="query" name="query" placeholder="Search tenants" /></div>
      <button class="btn btn--ghost" (click)="loadTenants()"><mat-icon>refresh</mat-icon><span>Refresh</span></button>
    </div>

    <div class="list" data-testid="tenants-list">
      @for (t of filteredTenants(); track t.tenantProfileId || t.userId) {
        <button class="row" (click)="selected.set(t)" [attr.data-testid]="'tenant-row-' + t.userId">
          <div class="avatar" [style.background]="color(t.name)">{{ initials(t.name) }}</div>
          <div class="info">
            <div class="name">{{ t.name }}</div>
            <div class="meta">{{ t.pgName || pgName(t.pgId) }} · Room {{ t.roomNumber || t.roomId || '-' }} · Joined {{ t.joiningDate || '-' }}</div>
            <div class="meta">{{ t.email }} · {{ t.phone }}</div>
            <div class="finance-strip">
              <div class="finance-pill">
                <span>Advance</span>
                <strong>{{ money(t.advanceAmountPaid || 0) }}</strong>
                <small>due {{ money(t.advanceDue) }}</small>
              </div>
              <div class="finance-pill">
                <span>Rent paid</span>
                <strong>{{ money(t.currentRentPaid) }}</strong>
                <small>{{ t.currentBillingMonth || 'No active cycle' }}</small>
              </div>
              <div class="finance-pill" [class.finance-pill--warn]="t.currentRentDue > 0">
                <span>Rent due</span>
                <strong>{{ money(t.currentRentDue) }}</strong>
                <small>{{ t.currentRentDue > 0 ? 'pending' : 'clear' }}</small>
              </div>
              <div class="finance-pill" [class.finance-pill--danger]="t.currentFine > 0">
                <span>Fine</span>
                <strong>{{ money(t.currentFine) }}</strong>
                <small>{{ t.overdueRecords }} overdue</small>
              </div>
            </div>
          </div>
          <div class="right">
            <div class="pill dot" [class.pill--occupied]="t.status === 'ACTIVE'" [class.pill--vacating]="t.status === 'VACATING'">{{ t.status }}</div>
            <div class="wallet">
              <span>Wallet</span>
              <strong>{{ money(t.creditWalletBalance || 0) }}</strong>
            </div>
          </div>
        </button>
      } @empty {
        <div class="empty card">No tenants found.</div>
      }
    </div>

    @if (selected(); as tenant) {
      <div class="backdrop" (click)="selected.set(null)"></div>
      <aside class="drawer card">
        <header>
          <div>
            <div class="crumb">Tenant detail</div>
            <h2>{{ tenant.name }}</h2>
            <p class="sub">{{ tenant.pgName || pgName(tenant.pgId) }} · Room {{ tenant.roomNumber || tenant.roomId || '-' }}</p>
          </div>
          <button class="icon" (click)="selected.set(null)"><mat-icon>close</mat-icon></button>
        </header>

        <div class="finance-panel">
          <div class="metric-card">
            <span>Advance paid</span>
            <strong>{{ money(tenant.advanceAmountPaid || 0) }}</strong>
          </div>
          <div class="metric-card" [class.metric-card--warn]="tenant.advanceDue > 0">
            <span>Advance due</span>
            <strong>{{ money(tenant.advanceDue) }}</strong>
          </div>
          <div class="metric-card">
            <span>Monthly rent</span>
            <strong>{{ money(tenant.monthlyRent) }}</strong>
          </div>
          <div class="metric-card">
            <span>{{ tenant.currentBillingMonth || 'Current cycle' }}</span>
            <strong>{{ money(tenant.currentRentPaid) }}</strong>
            <small>rent paid</small>
          </div>
          <div class="metric-card" [class.metric-card--warn]="tenant.currentRentDue > 0">
            <span>Rent due</span>
            <strong>{{ money(tenant.currentRentDue) }}</strong>
          </div>
          <div class="metric-card" [class.metric-card--danger]="tenant.currentFine > 0">
            <span>Fine</span>
            <strong>{{ money(tenant.currentFine) }}</strong>
          </div>
          <div class="metric-card">
            <span>Total rent paid</span>
            <strong>{{ money(tenant.totalRentPaid) }}</strong>
          </div>
          <div class="metric-card" [class.metric-card--warn]="tenant.totalRentOutstanding > 0">
            <span>Total outstanding</span>
            <strong>{{ money(tenant.totalRentOutstanding) }}</strong>
          </div>
          <div class="metric-card">
            <span>Wallet balance</span>
            <strong>{{ money(tenant.creditWalletBalance || 0) }}</strong>
          </div>
          <div class="metric-card">
            <span>KYC</span>
            <strong>{{ tenant.kycDocType || 'Pending' }}</strong>
          </div>
        </div>

        <div class="stats">
          <div><span>Room</span><strong>{{ tenant.roomNumber || tenant.roomId || '-' }}</strong></div>
          <div><span>PG</span><strong>{{ tenant.pgName || pgName(tenant.pgId) }}</strong></div>
          <div><span>Status</span><strong>{{ tenant.status }}</strong></div>
          <div><span>Joined</span><strong>{{ tenant.joiningDate || '-' }}</strong></div>
          <div><span>Deposit target</span><strong>{{ money(tenant.depositAmount) }}</strong></div>
          <div><span>Overdue records</span><strong>{{ tenant.overdueRecords }}</strong></div>
        </div>
      </aside>
    }
  </section>
  `,
  styles: [`
    .tenants { display: flex; flex-direction: column; gap: 18px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .crumb { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h1, h2 { margin: 6px 0 2px; letter-spacing: -0.02em; }
    h1 { font-size: 28px; }
    h2 { font-size: 24px; }
    .sub { color: var(--text-muted); font-size: 13px; margin: 0; }
    .form { display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 12px; padding: 16px; align-items: end; }
    @media (max-width: 960px) { .form { grid-template-columns: 1fr; } }
    .fld { display: flex; flex-direction: column; gap: 6px; }
    .fld.wide { grid-column: span 2; }
    .fld span { font-size: 11px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; }
    input, select { background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 10px; padding: 10px 12px; font-family: inherit; }
    .toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; }
    .search { display: flex; align-items: center; gap: 8px; min-width: 280px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 0 12px; }
    .search mat-icon { color: var(--text-muted); font-size: 18px; width: 18px; height: 18px; }
    .search input { border: 0; background: transparent; padding: 11px 0; width: 100%; }
    .list { display: flex; flex-direction: column; gap: 14px; }
    .row { display: grid; grid-template-columns: 44px 1fr auto; gap: 16px; align-items: start; padding: 16px 18px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; text-align: left; color: var(--text); cursor: pointer; font-family: inherit; }
    .row:hover { border-color: var(--primary); }
    .avatar { width: 40px; height: 40px; border-radius: 10px; color: white; font-weight: 700; display: grid; place-items: center; font-size: 13px; }
    .info { min-width: 0; }
    .name { font-weight: 700; font-size: 15px; }
    .meta { color: var(--text-muted); font-size: 12px; margin-top: 3px; }
    .finance-strip { display: grid; grid-template-columns: repeat(4, minmax(138px, 1fr)); gap: 10px; margin-top: 12px; }
    .finance-pill { display: grid; gap: 2px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 12px; background: rgba(255,255,255,0.02); }
    .finance-pill span, .finance-pill small { color: var(--text-muted); font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; }
    .finance-pill strong { font-size: 14px; font-family: var(--font-mono); }
    .finance-pill--warn { border-color: rgba(251,191,36,0.24); background: rgba(251,191,36,0.08); }
    .finance-pill--danger { border-color: rgba(248,113,113,0.26); background: rgba(248,113,113,0.08); }
    .right { display: grid; gap: 10px; justify-items: end; min-width: 120px; }
    .wallet { display: grid; gap: 3px; text-align: right; }
    .wallet span { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
    .wallet strong { font-family: var(--font-mono); font-size: 14px; }
    .empty { padding: 32px; color: var(--text-muted); text-align: center; }
    .backdrop { position: fixed; inset: 0; background: rgba(3,6,15,0.55); z-index: 40; }
    .drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 420px; max-width: 96vw; z-index: 50; padding: 24px; border-radius: 0; overflow: auto; }
    .drawer header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 20px; }
    .icon { border: 1px solid var(--border); background: transparent; color: var(--text-muted); border-radius: 10px; padding: 6px; cursor: pointer; }
    .finance-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
    .metric-card { background: var(--bg-elev); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: grid; gap: 4px; }
    .metric-card span, .metric-card small { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
    .metric-card strong { font-family: var(--font-mono); font-size: 16px; }
    .metric-card--warn { border-color: rgba(251,191,36,0.26); background: rgba(251,191,36,0.08); }
    .metric-card--danger { border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.08); }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .stats div { background: var(--bg-elev); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: grid; gap: 4px; }
    .stats span { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
    .stats strong { font-family: var(--font-mono); font-size: 15px; }
    @media (max-width: 1080px) {
      .finance-strip { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 760px) {
      .row { grid-template-columns: 44px 1fr; }
      .right { grid-column: 2; justify-items: start; min-width: 0; }
      .wallet { text-align: left; }
      .finance-panel, .stats { grid-template-columns: 1fr; }
    }
  `]
})
export class TenantsComponent {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  auth = inject(AuthService);

  tenants = signal<TenantFinanceView[]>([]);
  pgs = signal<PG[]>([]);
  allRooms = signal<Room[]>([]);
  rooms = signal<Room[]>([]);
  selected = signal<TenantFinanceView | null>(null);
  showForm = signal(false);
  saving = signal(false);
  query = '';
  selectedPgId = 0;
  form = this.blankForm();

  canOnboard = computed(() => this.auth.role() === 'MANAGER');
  subtitle = computed(() => `${this.tenants().length} tenants ${this.auth.role() === 'OWNER' ? 'across your portfolio' : 'across your assigned PGs'}.`);
  vacantRooms = computed(() => this.rooms().filter(room => room.status === 'VACANT'));
  filteredTenants = computed(() => {
    const q = this.query.toLowerCase().trim();
    return q ? this.tenants().filter(t => JSON.stringify(t).toLowerCase().includes(q)) : this.tenants();
  });

  constructor() {
    this.loadTenants();
  }

  loadTenants() {
    forkJoin({
      tenants: this.api.listTenants(),
      payments: this.api.listPayments(),
      pgs: this.api.listPgs()
    }).pipe(
      switchMap(({ tenants, payments, pgs }) => {
        this.pgs.set(pgs);
        if (pgs.length && !this.selectedPgId) {
          this.selectedPgId = pgs[0].id;
        }
        const roomRequests = pgs.length ? forkJoin(pgs.map(pg => this.api.listRooms(pg.id))) : of<Room[][]>([]);
        return roomRequests.pipe(
          switchMap(roomSets => {
            const allRooms = roomSets.flat();
            this.allRooms.set(allRooms);
            if (this.selectedPgId) {
              this.rooms.set(allRooms.filter(room => room.pgId === this.selectedPgId));
              this.form.roomId = this.vacantRooms()[0]?.id || 0;
            }
            return of(this.enrichTenants(tenants, payments, allRooms, pgs));
          })
        );
      })
    ).subscribe({ next: tenants => this.tenants.set(tenants) });
  }

  loadRooms(pgId: number) {
    if (!pgId) return;
    this.selectedPgId = pgId;
    const cached = this.allRooms().filter(room => room.pgId === pgId);
    if (cached.length) {
      this.rooms.set(cached);
      this.form.roomId = this.vacantRooms()[0]?.id || 0;
      return;
    }
    this.api.listRooms(pgId).subscribe({
      next: rooms => {
        this.rooms.set(rooms);
        this.allRooms.update(existing => [...existing.filter(room => room.pgId !== pgId), ...rooms]);
        this.form.roomId = this.vacantRooms()[0]?.id || 0;
      }
    });
  }

  createTenant() {
    this.saving.set(true);
    this.api.createTenant(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.form = this.blankForm();
        this.snack.open('Tenant onboarded', 'OK', { duration: 2200, panelClass: 'pgms-snack' });
        this.loadTenants();
        this.loadRooms(this.selectedPgId);
      },
      error: err => {
        this.saving.set(false);
        this.snack.open(err?.message || 'Could not create tenant', 'Dismiss', { duration: 3200, panelClass: 'pgms-snack' });
      }
    });
  }

  blankForm() {
    return {
      name: '',
      email: '',
      phone: '',
      roomId: 0,
      joiningDate: new Date().toISOString().slice(0, 10),
      advanceAmountPaid: 0
    };
  }

  pgName(pgId?: number): string {
    return this.pgs().find(pg => pg.id === pgId)?.name || 'PG';
  }

  money(value: number): string {
    return `₹${value.toLocaleString('en-IN')}`;
  }

  private enrichTenants(tenants: Tenant[], payments: RentRecord[], rooms: Room[], pgs: PG[]): TenantFinanceView[] {
    const roomsById = new Map(rooms.map(room => [room.id, room]));
    const pgNames = new Map(pgs.map(pg => [pg.id, pg.name]));
    return tenants.map(tenant => {
      const tenantPayments = payments
        .filter(record => record.tenantProfileId === tenant.tenantProfileId)
        .sort((a, b) => String(b.billingMonth).localeCompare(String(a.billingMonth)));
      const currentRecord = tenantPayments[0];
      const room = roomsById.get(tenant.roomId || 0);
      const depositAmount = room?.depositAmount || 0;
      const advancePaid = tenant.advanceAmountPaid || 0;

      return {
        ...tenant,
        roomNumber: tenant.roomNumber || room?.roomNumber || '',
        pgName: tenant.pgName || pgNames.get(tenant.pgId || 0) || '',
        monthlyRent: currentRecord?.rentAmount || room?.monthlyRent || 0,
        depositAmount,
        advanceDue: Math.max(depositAmount - advancePaid, 0),
        currentBillingMonth: currentRecord?.billingMonth || '',
        currentRentPaid: currentRecord?.amountPaid || 0,
        currentRentDue: currentRecord?.remainingAmountDue || 0,
        currentFine: currentRecord?.fineAccrued || 0,
        totalRentPaid: tenantPayments.reduce((sum, record) => sum + (record.amountPaid || 0), 0),
        totalRentOutstanding: tenantPayments.reduce((sum, record) => sum + (record.remainingAmountDue || 0), 0),
        overdueRecords: tenantPayments.filter(record => record.status === 'OVERDUE').length
      };
    });
  }

  initials(n: string) { return n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(); }

  color(n: string) {
    const colors = ['linear-gradient(135deg,#818cf8,#6366f1)', 'linear-gradient(135deg,#34d399,#10b981)', 'linear-gradient(135deg,#f472b6,#db2777)', 'linear-gradient(135deg,#a78bfa,#7c3aed)', 'linear-gradient(135deg,#fbbf24,#d97706)', 'linear-gradient(135deg,#60a5fa,#2563eb)'];
    let h = 0;
    for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return colors[h % colors.length];
  }
}
