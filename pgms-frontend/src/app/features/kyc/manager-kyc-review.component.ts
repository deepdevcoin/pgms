import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { Tenant } from '../../core/models';
import { DisplayDatePipe } from '../../shared/display-date.pipe';
import { PopupShellComponent } from '../../shared/popup-shell.component';

type KycFilter = 'ALL' | 'NOT_SUBMITTED' | 'SUBMITTED' | 'REPLACEMENT_REQUESTED' | 'VERIFIED';

@Component({
  selector: 'app-manager-kyc-review',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DisplayDatePipe, PopupShellComponent],
  template: `
    <section class="kyc-page fade-up">
      <header class="surface hero">
        <div>
          <div class="crumb">Verification</div>
          <h1>Tenant KYC review</h1>
          <p class="sub">Review uploaded tenant IDs, open the submitted document, and verify them once they are good to go.</p>
        </div>
        <button class="btn btn--ghost" type="button" (click)="load()">
          <mat-icon>refresh</mat-icon>
          <span>Refresh</span>
        </button>
      </header>

      <section class="summary-grid">
        <article class="summary-card">
          <span>Total tenants</span>
          <strong>{{ rows().length }}</strong>
          <small>Across your assigned PGs</small>
        </article>
        <article class="summary-card summary-card--warn">
          <span>Awaiting review</span>
          <strong>{{ submittedCount() }}</strong>
          <small>Uploaded and ready for verification</small>
        </article>
        <article class="summary-card summary-card--warn">
          <span>Replacement requested</span>
          <strong>{{ replacementCount() }}</strong>
          <small>Tenants need to upload a revised file</small>
        </article>
        <article class="summary-card">
          <span>Verified</span>
          <strong>{{ verifiedCount() }}</strong>
          <small>Documents already cleared</small>
        </article>
        <article class="summary-card">
          <span>Missing</span>
          <strong>{{ pendingCount() }}</strong>
          <small>No KYC document submitted yet</small>
        </article>
      </section>

      <div class="toolbar">
        <div class="search">
          <mat-icon>search</mat-icon>
          <input [(ngModel)]="query" name="query" placeholder="Search tenant, PG, room, or doc type" />
        </div>
        <div class="filters">
          @for (item of filters; track item) {
            <button class="chip" type="button" [class.chip--active]="statusFilter() === item" (click)="statusFilter.set(item)">
              {{ filterLabel(item) }}
            </button>
          }
        </div>
      </div>

      <div class="list">
        @for (tenant of filteredRows(); track tenant.tenantProfileId || tenant.userId) {
          <article class="row surface">
            <div class="row-main">
              <div class="row-top">
                <div>
                  <strong>{{ tenant.name }}</strong>
                  <div class="meta">{{ tenant.pgName || 'PG' }} · Room {{ tenant.roomNumber || '-' }}</div>
                </div>
                <span class="pill" [class.pill--warn]="tenant.kycStatus === 'SUBMITTED'" [class.pill--ok]="tenant.kycStatus === 'VERIFIED'">
                  {{ statusLabel(tenant.kycStatus) }}
                </span>
              </div>
              <div class="detail-grid">
                <div><span>Document</span><strong>{{ tenant.kycDocType || 'Not uploaded' }}</strong></div>
                <div><span>Submitted</span><strong>{{ tenant.kycSubmittedAt ? (tenant.kycSubmittedAt | displayDate:'datetime') : 'Pending' }}</strong></div>
                <div><span>Verified</span><strong>{{ tenant.kycVerifiedAt ? (tenant.kycVerifiedAt | displayDate:'datetime') : 'Not yet' }}</strong></div>
                <div><span>Verified by</span><strong>{{ tenant.kycVerifiedByName || '-' }}</strong></div>
              </div>
              @if (tenant.kycStatus === 'REPLACEMENT_REQUESTED' && tenant.kycReplacementNotes) {
                <div class="replacement-note">
                  <span>Replacement note</span>
                  <strong>{{ tenant.kycReplacementNotes }}</strong>
                  <small>{{ tenant.kycReplacementRequestedByName || 'Manager' }} · {{ tenant.kycReplacementRequestedAt | displayDate:'datetime' }}</small>
                </div>
              }
            </div>
            <div class="row-actions">
              <button class="btn btn--ghost" type="button" [disabled]="!tenant.kycDocPath" (click)="viewDocument(tenant)">
                <mat-icon>visibility</mat-icon>
                <span>View file</span>
              </button>
              @if (canRequestReplacement(tenant)) {
                <button class="btn btn--ghost" type="button" (click)="openReplacementDialog(tenant)">
                  <mat-icon>edit_document</mat-icon>
                  <span>Request replace</span>
                </button>
              }
              @if (tenant.kycStatus === 'SUBMITTED') {
                <button class="btn btn--primary" type="button" [disabled]="verifyingId() === tenant.tenantProfileId" (click)="verify(tenant)">
                  <mat-icon>verified</mat-icon>
                  <span>{{ verifyingId() === tenant.tenantProfileId ? 'Verifying...' : 'Verify' }}</span>
                </button>
              }
            </div>
          </article>
        } @empty {
          <div class="state surface">
            <mat-icon>inbox</mat-icon>
            <span>No tenant KYC records match this view.</span>
          </div>
        }
      </div>

      <app-popup-shell
        [open]="replacementDialogOpen()"
        eyebrow="KYC"
        [title]="replacementDialogTenantName() ? 'Request replacement for ' + replacementDialogTenantName() : 'Request replacement'"
        subtitle="Tell the tenant exactly what needs to be fixed before they upload again."
        (closed)="closeReplacementDialog()"
      >
        <label class="fld">
          <span>Replacement notes</span>
          <textarea [(ngModel)]="replacementNotes" name="replacementNotes"></textarea>
        </label>
        <div class="dialog-actions">
          <button class="btn btn--ghost" type="button" (click)="closeReplacementDialog()">Cancel</button>
          <button class="btn btn--primary" type="button" (click)="submitReplacementRequest()">
            <mat-icon>send</mat-icon>
            <span>Send request</span>
          </button>
        </div>
      </app-popup-shell>
    </section>
  `,
  styles: [`
    .kyc-page { display: flex; flex-direction: column; gap: 18px; }
    .surface { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
    .hero { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
    .crumb { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h1 { margin: 6px 0 2px; }
    .sub { margin: 0; color: var(--text-muted); max-width: 760px; line-height: 1.6; }
    .summary-grid { display: grid; grid-template-columns: repeat(5, minmax(160px, 1fr)); gap: 12px; }
    .summary-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; display: grid; gap: 6px; }
    .summary-card--warn { border-color: rgba(251,191,36,0.28); }
    .summary-card span, .summary-card small { color: var(--text-muted); font-size: 12px; }
    .summary-card strong { font-size: 24px; }
    .toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; }
    .search { display: flex; align-items: center; gap: 8px; min-width: 280px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 0 12px; }
    .search input { border: 0; background: transparent; color: var(--text); width: 100%; padding: 11px 0; }
    .filters { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip { border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); border-radius: 999px; padding: 8px 12px; cursor: pointer; }
    .chip--active { color: var(--text); border-color: var(--primary); background: rgba(99,102,241,0.12); }
    .list { display: flex; flex-direction: column; gap: 12px; }
    .row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: center; }
    .row-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .meta, .detail-grid span { color: var(--text-muted); font-size: 12px; }
    .detail-grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 12px; margin-top: 14px; }
    .detail-grid div { padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg); display: grid; gap: 4px; }
    .detail-grid strong { font-size: 13px; }
    .replacement-note { margin-top: 12px; display: grid; gap: 5px; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(251,191,36,0.32); background: rgba(251,191,36,0.08); }
    .replacement-note span, .replacement-note small { color: var(--text-muted); font-size: 12px; }
    .replacement-note strong { line-height: 1.5; }
    .row-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .pill { display: inline-flex; align-items: center; padding: 7px 10px; border-radius: 999px; background: rgba(255,255,255,0.06); color: var(--text); font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .pill--warn { background: rgba(251,191,36,0.12); color: #fcd34d; }
    .pill--ok { background: rgba(52,211,153,0.12); color: #6ee7b7; }
    .state { min-height: 180px; display: grid; place-items: center; gap: 10px; color: var(--text-muted); text-align: center; }
    .fld { display: grid; gap: 8px; }
    .fld span { color: var(--text-muted); font-size: 12px; font-weight: 600; }
    .fld textarea { width: 100%; min-height: 120px; background: var(--bg-elev); border: 1px solid var(--border); color: var(--text); border-radius: 12px; padding: 12px 14px; font: inherit; resize: vertical; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 10px; }
    @media (max-width: 1100px) {
      .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .row { grid-template-columns: 1fr; }
      .row-actions { justify-content: flex-start; }
      .detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .summary-grid, .detail-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ManagerKycReviewComponent {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  readonly filters: KycFilter[] = ['ALL', 'SUBMITTED', 'REPLACEMENT_REQUESTED', 'VERIFIED', 'NOT_SUBMITTED'];

  rows = signal<Tenant[]>([]);
  statusFilter = signal<KycFilter>('ALL');
  verifyingId = signal<number | null>(null);
  replacementDialogOpen = signal(false);
  replacementDialogTenant = signal<Tenant | null>(null);
  replacementDialogTenantName = computed(() => this.replacementDialogTenant()?.name || '');
  query = '';
  replacementNotes = '';

  filteredRows = computed(() => {
    const filter = this.statusFilter();
    const q = this.query.toLowerCase().trim();
    return this.rows().filter(row => {
      const status = (row.kycStatus || 'NOT_SUBMITTED') as KycFilter;
      const matchesFilter = filter === 'ALL' ? true : status === filter;
      if (!matchesFilter) return false;
      if (!q) return true;
      return JSON.stringify(row).toLowerCase().includes(q);
    });
  });

  submittedCount = computed(() => this.rows().filter(row => row.kycStatus === 'SUBMITTED').length);
  replacementCount = computed(() => this.rows().filter(row => row.kycStatus === 'REPLACEMENT_REQUESTED').length);
  verifiedCount = computed(() => this.rows().filter(row => row.kycStatus === 'VERIFIED').length);
  pendingCount = computed(() => this.rows().filter(row => !row.kycDocPath || row.kycStatus === 'NOT_SUBMITTED').length);

  constructor() {
    this.load();
  }

  load() {
    this.api.listManagerKyc().subscribe({
      next: rows => this.rows.set(rows),
      error: err => this.snack.open(err?.message || 'Could not load KYC queue', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' })
    });
  }

  filterLabel(filter: KycFilter): string {
    if (filter === 'ALL') return 'All';
    if (filter === 'NOT_SUBMITTED') return 'Missing';
    if (filter === 'REPLACEMENT_REQUESTED') return 'Replace';
    return filter === 'SUBMITTED' ? 'Submitted' : 'Verified';
  }

  statusLabel(status?: string): string {
    if (status === 'VERIFIED') return 'Verified';
    if (status === 'REPLACEMENT_REQUESTED') return 'Replacement requested';
    if (status === 'SUBMITTED') return 'Awaiting review';
    return 'Missing';
  }

  canRequestReplacement(tenant: Tenant): boolean {
    return !!tenant.tenantProfileId && !!tenant.kycDocPath && (tenant.kycStatus === 'VERIFIED' || tenant.kycStatus === 'SUBMITTED');
  }

  viewDocument(tenant: Tenant) {
    if (!tenant.tenantProfileId) return;
    this.api.downloadManagerKycDocument(tenant.tenantProfileId).subscribe({
      next: blob => this.openBlob(blob),
      error: err => this.snack.open(err?.message || 'Could not open KYC document', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' })
    });
  }

  verify(tenant: Tenant) {
    if (!tenant.tenantProfileId) return;
    this.verifyingId.set(tenant.tenantProfileId);
    this.api.verifyTenantKyc(tenant.tenantProfileId).subscribe({
      next: updated => {
        this.verifyingId.set(null);
        this.rows.set(this.rows().map(row => row.tenantProfileId === updated.tenantProfileId ? updated : row));
        this.snack.open('Tenant KYC verified', 'OK', { duration: 2200, panelClass: 'pgms-snack' });
      },
      error: err => {
        this.verifyingId.set(null);
        this.snack.open(err?.message || 'Could not verify KYC', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' });
      }
    });
  }

  openReplacementDialog(tenant: Tenant) {
    this.replacementDialogTenant.set(tenant);
    this.replacementNotes = tenant.kycReplacementNotes || '';
    this.replacementDialogOpen.set(true);
  }

  closeReplacementDialog() {
    this.replacementDialogOpen.set(false);
    this.replacementDialogTenant.set(null);
    this.replacementNotes = '';
  }

  submitReplacementRequest() {
    const tenant = this.replacementDialogTenant();
    const notes = this.replacementNotes.trim();
    if (!tenant?.tenantProfileId) return;
    if (!notes) {
      this.snack.open('Add replacement notes for the tenant.', 'Dismiss', { duration: 2400, panelClass: 'pgms-snack' });
      return;
    }
    this.api.requestTenantKycReplacement(tenant.tenantProfileId, notes).subscribe({
      next: updated => {
        this.rows.set(this.rows().map(row => row.tenantProfileId === updated.tenantProfileId ? updated : row));
        this.closeReplacementDialog();
        this.snack.open('Replacement request sent to tenant', 'OK', { duration: 2200, panelClass: 'pgms-snack' });
      },
      error: err => this.snack.open(err?.message || 'Could not send replacement request', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' })
    });
  }

  private openBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
