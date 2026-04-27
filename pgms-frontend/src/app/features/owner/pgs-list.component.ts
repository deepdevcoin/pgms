import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { PG, PgCreatePayload } from '../../core/models';
import { PopupShellComponent } from '../../shared/popup-shell.component';
import { PropertyDetailDrawerComponent } from './property-detail-drawer.component';
import { PropertyFormComponent } from './property-form.component';

@Component({
  selector: 'app-pgs-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, PopupShellComponent, PropertyFormComponent, PropertyDetailDrawerComponent],
  template: `
    <section class="properties fade-up">
      <header class="head">
        <div>
          <div class="crumb">Properties</div>
          <h1>Owner portfolio</h1>
          <p class="sub">Create properties, scan readiness, and jump straight into layout management.</p>
        </div>
        <button class="btn btn--primary" type="button" (click)="openCreate()">
          <mat-icon>add_business</mat-icon>
          <span>Add property</span>
        </button>
      </header>

      <div class="stats">
        <article class="stat">
          <span>Properties</span>
          <strong>{{ stats().properties }}</strong>
          <small>Total PGs in the portfolio</small>
        </article>
        <article class="stat">
          <span>Rooms tracked</span>
          <strong>{{ stats().rooms }}</strong>
          <small>Across active properties</small>
        </article>
        <article class="stat">
          <span>Vacancies</span>
          <strong class="stat-value--vacant">{{ stats().vacancies }}</strong>
          <small>Open capacity ready to fill</small>
        </article>
        <article class="stat">
          <span>Occupancy</span>
          <strong>{{ stats().occupancyRate }}%</strong>
          <small>Based on occupied and vacating rooms</small>
        </article>
      </div>

      <section class="intro-band">
        <div class="intro-copy">
          <div class="eyebrow">Portfolio setup</div>
          <h2>Each property starts light, then grows into layout, staffing, and tenants.</h2>
          <p>Set the core identity and operating defaults here. Rooms can be added from Layout whenever the property is ready for onboarding.</p>
        </div>

        <div class="toolbar">
          <label class="search" aria-label="Search properties">
            <mat-icon>search</mat-icon>
            <input
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
              name="propertyQuery"
              type="text"
              placeholder="Search by property name or address"
            />
          </label>
          <button class="btn btn--ghost" type="button" (click)="load(true)" [disabled]="loading()">
            <mat-icon>refresh</mat-icon>
            <span>{{ loading() ? 'Refreshing...' : 'Refresh' }}</span>
          </button>
        </div>
      </section>

      @if (filteredPgs().length) {
        <div class="grid" data-testid="pgs-grid">
          @for (pg of filteredPgs(); track pg.id) {
            <article class="property-card" [attr.data-testid]="'pg-card-' + pg.id">
              <div class="card-top">
                <div class="identity">
                  <div class="icon">
                    <mat-icon>apartment</mat-icon>
                  </div>
                  <div class="identity-copy">
                    <div class="name">{{ pg.name }}</div>
                    <div class="addr">{{ pg.address }}</div>
                  </div>
                </div>
                <span class="pill dot" [ngClass]="availabilityClass(pg)">{{ availabilityLabel(pg) }}</span>
              </div>

              <div class="facts">
                <div class="fact">
                  <span>Floors</span>
                  <strong>{{ pg.totalFloors }}</strong>
                </div>
                <div class="fact">
                  <span>Rooms</span>
                  <strong>{{ roomCount(pg) }}</strong>
                </div>
                <div class="fact">
                  <span>Deadline</span>
                  <strong>Day {{ pg.paymentDeadlineDay }}</strong>
                </div>
                <div class="fact">
                  <span>Fine / day</span>
                  <strong>₹{{ pg.fineAmountPerDay }}</strong>
                </div>
              </div>

              <div class="occupancy">
                <div class="occupancy-head">
                  <span>Occupancy</span>
                  <strong>{{ occupancyRate(pg) }}%</strong>
                </div>
                <div class="track" aria-hidden="true">
                  <span class="fill" [style.width.%]="occupancyRate(pg)"></span>
                </div>
                <div class="legend">
                  <span class="pill dot pill--vacant">{{ pg.vacantCount }} vacant</span>
                  <span class="pill dot pill--occupied">{{ pg.occupiedCount }} occupied</span>
                  @if (pg.vacatingCount) {
                    <span class="pill dot pill--vacating">{{ pg.vacatingCount }} vacating</span>
                  }
                </div>
              </div>

              <div class="card-footer">
                <div class="footer-note">
                  <span>SLA</span>
                  <strong>{{ pg.slaHours }} hours</strong>
                </div>
                <div class="card-actions">
                  <button class="btn btn--ghost" type="button" (click)="openManage(pg.id)">
                    <mat-icon>tune</mat-icon>
                    <span>Manage</span>
                  </button>
                  <a class="btn btn--primary" [routerLink]="['/owner/layout', pg.id]">
                    <mat-icon>grid_view</mat-icon>
                    <span>Open layout</span>
                  </a>
                </div>
              </div>
            </article>
          }
        </div>
      } @else {
        <section class="empty-state card">
          <div class="empty-icon"><mat-icon>{{ pgs().length ? 'search_off' : 'domain_add' }}</mat-icon></div>
          <h3>{{ pgs().length ? 'No matching properties' : 'Create your first property' }}</h3>
          <p>
            {{ pgs().length
              ? 'Try a different search term or clear the filter to see the full portfolio.'
              : 'Start with the property name, address, floors, and operating defaults. You can add rooms after the property is created.' }}
          </p>
          <button class="btn btn--primary" type="button" (click)="pgs().length ? clearSearch() : openCreate()">
            <mat-icon>{{ pgs().length ? 'restart_alt' : 'add_business' }}</mat-icon>
            <span>{{ pgs().length ? 'Clear search' : 'Add property' }}</span>
          </button>
        </section>
      }
    </section>

    <app-popup-shell
      [open]="showCreate()"
      eyebrow="Properties"
      title="Add a new property"
      subtitle="Capture the essentials now, then continue setup from the layout workspace."
      (closed)="closeCreate()"
    >
      <app-property-form
        [model]="draft"
        [saving]="saving()"
        [errorMessage]="createError()"
        (submitted)="createProperty($event)"
        (cancelled)="closeCreate()"
      />
    </app-popup-shell>

    <app-property-detail-drawer
      [property]="selectedProperty()"
      (closed)="selectedPropertyId.set(null)"
      (propertySaved)="handlePropertySaved($event)"
      (inventoryChanged)="loadSelectedPropertyInventory()"
    />
  `,
  styles: [`
    .properties { display: flex; flex-direction: column; gap: 20px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .crumb, .eyebrow {
      font-size: 11px;
      color: var(--primary);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
    }
    h1, h2, h3 { margin: 6px 0 2px; letter-spacing: -0.02em; }
    h1 { font-size: 30px; }
    h2 { font-size: 22px; max-width: 18ch; }
    h3 { font-size: 24px; }
    .sub { color: var(--text-muted); font-size: 13px; margin: 0; }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .stat {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      display: grid;
      gap: 6px;
    }
    .stat span, .stat small {
      color: var(--text-muted);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .stat strong {
      font-size: 26px;
      font-family: var(--font-mono);
      letter-spacing: -0.03em;
    }
    .stat-value--vacant { color: var(--status-vacant-text); }
    .intro-band {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: end;
      padding: 18px 20px;
      border-radius: 18px;
      border: 1px solid var(--border);
      background:
        linear-gradient(135deg, rgba(52,211,153,0.12), rgba(129,140,248,0.08)),
        var(--surface);
    }
    .intro-copy { display: grid; gap: 6px; }
    .intro-copy p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 62ch; }
    .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
    .search {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: min(360px, 100%);
      background: rgba(11,15,26,0.58);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 0 12px;
    }
    .search mat-icon { color: var(--text-muted); font-size: 18px; width: 18px; height: 18px; }
    .search input {
      width: 100%;
      border: 0;
      background: transparent;
      color: var(--text);
      padding: 11px 0;
      font-family: inherit;
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .property-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }
    .card-top, .card-footer { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .identity { display: flex; gap: 12px; min-width: 0; }
    .icon {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: rgba(52,211,153,0.1);
      color: var(--primary);
      flex: 0 0 auto;
    }
    .identity-copy { min-width: 0; }
    .name { font-weight: 700; font-size: 17px; }
    .addr {
      color: var(--text-muted);
      font-size: 12px;
      margin-top: 4px;
      line-height: 1.5;
      word-break: break-word;
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      padding: 14px 0;
      border-top: 1px dashed var(--border);
      border-bottom: 1px dashed var(--border);
    }
    .fact {
      display: grid;
      gap: 4px;
      min-width: 0;
    }
    .fact span, .footer-note span {
      color: var(--text-muted);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .fact strong, .footer-note strong {
      font-size: 14px;
      font-family: var(--font-mono);
    }
    .occupancy { display: grid; gap: 10px; }
    .occupancy-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      font-size: 12px;
    }
    .occupancy-head span { color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
    .occupancy-head strong { font-size: 14px; font-family: var(--font-mono); }
    .track {
      height: 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.04);
      overflow: hidden;
    }
    .fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--primary), var(--accent));
    }
    .legend { display: flex; gap: 6px; flex-wrap: wrap; }
    .footer-note { display: grid; gap: 4px; }
    .card-footer { align-items: end; }
    .card-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
    .card-actions .btn { display: inline-flex; align-items: center; gap: 8px; }
    .empty-state {
      padding: 36px;
      display: grid;
      gap: 12px;
      justify-items: center;
      text-align: center;
    }
    .empty-state p {
      margin: 0;
      color: var(--text-muted);
      font-size: 13px;
      max-width: 48ch;
    }
    .empty-icon {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      display: grid;
      place-items: center;
      background: rgba(52,211,153,0.1);
      color: var(--primary);
    }
    .empty-icon mat-icon { font-size: 26px; width: 26px; height: 26px; }
    @media (max-width: 1100px) {
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .intro-band { align-items: stretch; flex-direction: column; }
      h2 { max-width: none; }
    }
    @media (max-width: 720px) {
      .stats { grid-template-columns: 1fr; }
      .card-top, .card-footer { flex-direction: column; align-items: stretch; }
      .card-actions { justify-content: stretch; }
      .facts { grid-template-columns: 1fr 1fr; }
      .toolbar { justify-content: stretch; }
      .search { min-width: 0; width: 100%; }
      .toolbar .btn, .card-actions .btn { width: 100%; justify-content: center; }
    }
  `]
})
export class PgsListComponent {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  pgs = signal<PG[]>([]);
  query = signal('');
  loading = signal(false);
  showCreate = signal(false);
  saving = signal(false);
  createError = signal('');
  selectedPropertyId = signal<number | null>(null);
  draft = this.blankDraft();

  stats = computed(() => {
    const pgs = this.pgs();
    const rooms = pgs.reduce((sum, pg) => sum + this.roomCount(pg), 0);
    const vacancies = pgs.reduce((sum, pg) => sum + pg.vacantCount, 0);
    const occupied = pgs.reduce((sum, pg) => sum + pg.occupiedCount + pg.vacatingCount, 0);
    const occupancyRate = rooms ? Math.round((occupied / rooms) * 100) : 0;
    return {
      properties: pgs.length,
      rooms,
      vacancies,
      occupancyRate
    };
  });

  filteredPgs = computed(() => {
    const term = this.query().trim().toLowerCase();
    const pgs = this.pgs();
    if (!term) return pgs;
    return pgs.filter(pg =>
      pg.name.toLowerCase().includes(term) ||
      pg.address.toLowerCase().includes(term)
    );
  });

  selectedProperty = computed(() => {
    const selectedId = this.selectedPropertyId();
    return this.pgs().find(pg => pg.id === selectedId) || null;
  });

  constructor() {
    this.load();
  }

  load(showRefreshToast = false) {
    this.loading.set(true);
    this.api.listPgs().subscribe({
      next: pgs => {
        this.pgs.set(pgs);
        if (this.selectedPropertyId() && !pgs.some(pg => pg.id === this.selectedPropertyId())) {
          this.selectedPropertyId.set(null);
        }
        this.loading.set(false);
        if (showRefreshToast) {
          this.snack.open('Properties refreshed', 'OK', { duration: 2200, panelClass: 'pgms-snack' });
        }
      },
      error: err => {
        this.loading.set(false);
        this.snack.open(err?.message || 'Could not load properties', 'Dismiss', { duration: 3200, panelClass: 'pgms-snack' });
      }
    });
  }

  openCreate() {
    this.draft = this.blankDraft();
    this.createError.set('');
    this.showCreate.set(true);
  }

  closeCreate() {
    this.showCreate.set(false);
    this.saving.set(false);
    this.createError.set('');
    this.draft = this.blankDraft();
  }

  createProperty(payload: PgCreatePayload) {
    this.saving.set(true);
    this.createError.set('');
    this.api.createPg(payload).subscribe({
      next: pg => {
        this.pgs.set([pg, ...this.pgs()]);
        this.closeCreate();
        this.snack.open('Property created. You can add rooms from Layout next.', 'OK', { duration: 3200, panelClass: 'pgms-snack' });
      },
      error: err => {
        const message = err?.message || 'Could not create property';
        this.saving.set(false);
        this.createError.set(message);
      }
    });
  }

  clearSearch() {
    this.query.set('');
  }

  openManage(pgId: number) {
    this.selectedPropertyId.set(pgId);
  }

  handlePropertySaved(updated: PG) {
    this.pgs.set(this.pgs().map(pg => pg.id === updated.id ? updated : pg));
  }

  loadSelectedPropertyInventory() {
    const selectedId = this.selectedPropertyId();
    if (!selectedId) return;
    this.api.listPgs().subscribe({
      next: pgs => {
        this.pgs.set(pgs);
        this.selectedPropertyId.set(pgs.some(pg => pg.id === selectedId) ? selectedId : null);
      },
      error: err => {
        this.snack.open(err?.message || 'Could not refresh property totals', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' });
      }
    });
  }

  roomCount(pg: PG): number {
    return pg.vacantCount + pg.occupiedCount + pg.vacatingCount;
  }

  occupancyRate(pg: PG): number {
    const rooms = this.roomCount(pg);
    if (!rooms) return 0;
    return Math.round(((pg.occupiedCount + pg.vacatingCount) / rooms) * 100);
  }

  availabilityLabel(pg: PG): string {
    const rooms = this.roomCount(pg);
    if (!rooms) return 'Setup needed';
    if (pg.vacantCount > 0) return `${pg.vacantCount} vacancies`;
    if (pg.vacatingCount > 0) return `${pg.vacatingCount} vacating`;
    return 'Fully occupied';
  }

  availabilityClass(pg: PG): string {
    const rooms = this.roomCount(pg);
    if (!rooms) return 'pill--partial';
    if (pg.vacantCount > 0) return 'pill--vacant';
    if (pg.vacatingCount > 0) return 'pill--vacating';
    return 'pill--occupied';
  }

  private blankDraft(): PgCreatePayload {
    return {
      name: '',
      address: '',
      totalFloors: 1,
      paymentDeadlineDay: 5,
      fineAmountPerDay: 100,
      slaHours: 48
    };
  }
}
