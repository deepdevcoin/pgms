import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { PG, Room, Tenant } from '../../core/models';

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
        <p class="sub">{{ tenants().length }} tenants across your assigned PGs.</p>
      </div>
      <button class="btn btn--primary" (click)="showForm.set(!showForm())">
        <mat-icon>{{ showForm() ? 'close' : 'person_add' }}</mat-icon>
        <span>{{ showForm() ? 'Close' : 'Onboard tenant' }}</span>
      </button>
    </header>

    @if (showForm()) {
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
              <option [ngValue]="room.id">{{ room.roomNumber }} · Floor {{ room.floor }} · {{ room.sharingType }} · ₹{{ room.monthlyRent | number:'1.0-0' }}</option>
            }
          </select>
        </label>
        <button class="btn btn--primary" type="submit" [disabled]="saving()"><mat-icon>check</mat-icon><span>{{ saving() ? 'Saving...' : 'Create tenant' }}</span></button>
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
            <div class="meta">{{ t.email }} · {{ t.phone }}</div>
            <div class="meta">Room {{ t.roomNumber || t.roomId || '-' }} · Joined {{ t.joiningDate || '-' }}</div>
          </div>
          <div class="right">
            <div class="pill dot" [class.pill--occupied]="t.status === 'ACTIVE'" [class.pill--vacating]="t.status === 'VACATING'">{{ t.status }}</div>
            <div class="wallet">₹{{ (t.creditWalletBalance || 0) | number:'1.0-0' }}</div>
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
            <p class="sub">{{ tenant.email }} · {{ tenant.phone }}</p>
          </div>
          <button class="icon" (click)="selected.set(null)"><mat-icon>close</mat-icon></button>
        </header>
        <div class="stats">
          <div><span>Room</span><strong>{{ tenant.roomNumber || tenant.roomId || '-' }}</strong></div>
          <div><span>Status</span><strong>{{ tenant.status }}</strong></div>
          <div><span>Advance</span><strong>₹{{ (tenant.advanceAmountPaid || 0) | number:'1.0-0' }}</strong></div>
          <div><span>Wallet</span><strong>₹{{ (tenant.creditWalletBalance || 0) | number:'1.0-0' }}</strong></div>
          <div><span>KYC</span><strong>{{ tenant.kycDocType || 'Pending' }}</strong></div>
          <div><span>Joined</span><strong>{{ tenant.joiningDate || '-' }}</strong></div>
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
    h1 { font-size: 28px; } h2 { font-size: 24px; }
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
    .list { display: flex; flex-direction: column; gap: 10px; }
    .row { display: grid; grid-template-columns: 44px 1fr auto; gap: 14px; align-items: center; padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; text-align: left; color: var(--text); cursor: pointer; font-family: inherit; }
    .row:hover { border-color: var(--primary); }
    .avatar { width: 40px; height: 40px; border-radius: 10px; color: white; font-weight: 700; display: grid; place-items: center; font-size: 13px; }
    .name { font-weight: 600; font-size: 14px; }
    .meta { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
    .right { display: grid; gap: 6px; justify-items: end; }
    .wallet { color: var(--text-muted); font-family: var(--font-mono); font-size: 12px; }
    .empty { padding: 32px; color: var(--text-muted); text-align: center; }
    .backdrop { position: fixed; inset: 0; background: rgba(3,6,15,0.55); z-index: 40; }
    .drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 420px; max-width: 96vw; z-index: 50; padding: 24px; border-radius: 0; overflow: auto; }
    .drawer header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 20px; }
    .icon { border: 1px solid var(--border); background: transparent; color: var(--text-muted); border-radius: 10px; padding: 6px; cursor: pointer; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .stats div { background: var(--bg-elev); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: grid; gap: 4px; }
    .stats span { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
    .stats strong { font-family: var(--font-mono); font-size: 15px; }
  `]
})
export class TenantsComponent {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  tenants = signal<Tenant[]>([]);
  pgs = signal<PG[]>([]);
  rooms = signal<Room[]>([]);
  selected = signal<Tenant | null>(null);
  showForm = signal(false);
  saving = signal(false);
  query = '';
  selectedPgId = 0;
  form = this.blankForm();

  vacantRooms = computed(() => this.rooms().filter(room => room.status === 'VACANT'));
  filteredTenants = computed(() => {
    const q = this.query.toLowerCase().trim();
    return q ? this.tenants().filter(t => JSON.stringify(t).toLowerCase().includes(q)) : this.tenants();
  });

  constructor() {
    this.loadTenants();
    this.api.listPgs().subscribe({
      next: pgs => {
        this.pgs.set(pgs);
        if (pgs.length) {
          this.selectedPgId = pgs[0].id;
          this.loadRooms(pgs[0].id);
        }
      }
    });
  }

  loadTenants() {
    this.api.listTenants().subscribe({ next: tenants => this.tenants.set(tenants) });
  }

  loadRooms(pgId: number) {
    if (!pgId) return;
    this.api.listRooms(pgId).subscribe({
      next: rooms => {
        this.rooms.set(rooms);
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

  initials(n: string) { return n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(); }
  color(n: string) {
    const colors = ['linear-gradient(135deg,#818cf8,#6366f1)', 'linear-gradient(135deg,#34d399,#10b981)', 'linear-gradient(135deg,#f472b6,#db2777)', 'linear-gradient(135deg,#a78bfa,#7c3aed)', 'linear-gradient(135deg,#fbbf24,#d97706)', 'linear-gradient(135deg,#60a5fa,#2563eb)'];
    let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return colors[h % colors.length];
  }
}
