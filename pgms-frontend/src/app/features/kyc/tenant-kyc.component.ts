import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { Tenant } from '../../core/models';
import { DisplayDatePipe } from '../../shared/display-date.pipe';

@Component({
  selector: 'app-tenant-kyc',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DisplayDatePipe],
  template: `
    <section class="kyc-page fade-up">
      <header class="surface hero">
        <div>
          <div class="crumb">Verification</div>
          <h1>KYC documents</h1>
          <p class="sub">Upload your ID once, keep track of review status, and reopen the document whenever you need it.</p>
        </div>
        <button class="btn btn--ghost" type="button" (click)="load()">
          <mat-icon>refresh</mat-icon>
          <span>Refresh</span>
        </button>
      </header>

      <section class="summary-grid">
        <article class="summary-card">
          <span>Status</span>
          <strong>{{ statusLabel(profile()?.kycStatus) }}</strong>
          <small>{{ statusCopy(profile()) }}</small>
        </article>
        <article class="summary-card">
          <span>Document type</span>
          <strong>{{ profile()?.kycDocType || 'Not uploaded' }}</strong>
          <small>{{ profile()?.kycDocPath ? 'Document is on file' : 'Upload required' }}</small>
        </article>
        <article class="summary-card">
          <span>Submitted</span>
          <strong>{{ profile()?.kycSubmittedAt ? (profile()?.kycSubmittedAt | displayDate:'datetime') : 'Pending' }}</strong>
          <small>Last upload timestamp</small>
        </article>
        <article class="summary-card">
          <span>Verified</span>
          <strong>{{ profile()?.kycVerifiedAt ? (profile()?.kycVerifiedAt | displayDate:'datetime') : 'Not yet' }}</strong>
          <small>{{ profile()?.kycVerifiedByName || 'Manager review pending' }}</small>
        </article>
      </section>

      <div class="workspace">
        <section class="surface form-surface">
          <div class="section-head">
            <div>
              <div class="section-kicker">Upload</div>
              <h2>{{ uploadPanelTitle() }}</h2>
            </div>
          </div>

          @if (showReplacementRequest()) {
            <div class="notice-block notice-block--warn">
              <div class="notice-head">
                <strong>Replacement requested</strong>
                <small>{{ profile()?.kycReplacementRequestedAt | displayDate:'datetime' }}</small>
              </div>
              <p>{{ profile()?.kycReplacementNotes }}</p>
              <div class="notice-meta">Requested by {{ profile()?.kycReplacementRequestedByName || 'manager' }}</div>
            </div>
          } @else if (profile()?.kycStatus === 'VERIFIED') {
            <div class="notice-block">
              <div class="notice-head">
                <strong>Verified and locked</strong>
              </div>
              <p>Your current KYC file is verified. You can replace it only after your manager sends a replacement request with notes.</p>
            </div>
          } @else if (profile()?.kycStatus === 'SUBMITTED' && profile()?.kycDocPath) {
            <div class="notice-block notice-block--ok">
              <div class="notice-head">
                <strong>{{ replacementUploaded() ? 'Replacement uploaded' : 'Document submitted' }}</strong>
                <small>{{ profile()?.kycSubmittedAt | displayDate:'datetime' }}</small>
              </div>
              <p>{{ replacementUploaded() ? 'Your replacement file is now waiting for manager review. The old replacement request is closed.' : 'Your document is waiting for manager review.' }}</p>
              <div class="notice-meta">You can view the submitted file while review is pending.</div>
            </div>
          }

          @if (canUpload()) {
            <label class="fld">
              <span>Document type</span>
              <select [(ngModel)]="docType" name="docType">
                @for (option of docTypes; track option) {
                  <option [value]="option">{{ option }}</option>
                }
              </select>
            </label>

            <label class="fld">
              <span>Document file</span>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" (change)="onFileChange($event)" />
            </label>

            <div class="file-pill" [class.file-pill--muted]="!selectedFileName()">
              <mat-icon>{{ selectedFileName() ? 'description' : 'upload_file' }}</mat-icon>
              <span>{{ selectedFileName() || 'PDF, JPG, JPEG, or PNG' }}</span>
            </div>

            <div class="actions">
              <button class="btn btn--primary" type="button" [disabled]="saving() || !selectedFile()" (click)="upload()">
                <mat-icon>cloud_upload</mat-icon>
                <span>{{ saving() ? 'Uploading...' : uploadLabel() }}</span>
              </button>
              @if (profile()?.kycDocPath) {
                <button class="btn btn--ghost" type="button" (click)="viewDocument()">
                  <mat-icon>visibility</mat-icon>
                  <span>View current file</span>
                </button>
              }
            </div>
          } @else if (profile()?.kycDocPath) {
            <div class="actions">
              <button class="btn btn--ghost" type="button" (click)="viewDocument()">
                <mat-icon>visibility</mat-icon>
                <span>View current file</span>
              </button>
            </div>
          }
        </section>

        <section class="surface status-surface">
          <div class="section-head">
            <div>
              <div class="section-kicker">Review</div>
              <h2>What happens next</h2>
            </div>
          </div>

          <div class="timeline">
            <div class="timeline-row" [class.timeline-row--done]="!!profile()?.kycDocPath">
              <span class="timeline-dot"></span>
              <div>
                <strong>Upload submitted</strong>
                <small>{{ profile()?.kycSubmittedAt ? (profile()?.kycSubmittedAt | displayDate:'datetime') : 'Waiting for your document' }}</small>
              </div>
            </div>
            <div class="timeline-row" [class.timeline-row--done]="profile()?.kycStatus === 'VERIFIED'">
              <span class="timeline-dot"></span>
              <div>
                <strong>Manager verification</strong>
                <small>
                  @if (profile()?.kycStatus === 'VERIFIED') {
                    Verified by {{ profile()?.kycVerifiedByName || 'manager' }} on {{ profile()?.kycVerifiedAt | displayDate:'datetime' }}
                  } @else {
                    Your PG manager will review and verify the document here.
                  }
                </small>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  `,
  styles: [`
    .kyc-page { display: flex; flex-direction: column; gap: 18px; }
    .surface { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
    .hero { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
    .crumb, .section-kicker { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h1, h2 { margin: 6px 0 2px; }
    .sub { margin: 0; color: var(--text-muted); max-width: 720px; line-height: 1.6; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(180px, 1fr)); gap: 12px; }
    .summary-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; display: grid; gap: 6px; }
    .summary-card span, .summary-card small { color: var(--text-muted); font-size: 12px; }
    .summary-card strong { font-size: 22px; }
    .workspace { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr); gap: 16px; }
    .form-surface, .status-surface { display: grid; gap: 14px; }
    .section-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .fld { display: grid; gap: 8px; }
    .fld span { font-size: 12px; color: var(--text-muted); font-weight: 600; }
    .fld select, .fld input { background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 12px; padding: 12px 14px; font: inherit; }
    .file-pill { display: inline-flex; align-items: center; gap: 10px; width: fit-content; padding: 10px 12px; border: 1px solid var(--border); border-radius: 999px; background: rgba(255,255,255,0.03); color: var(--text); }
    .file-pill--muted { color: var(--text-muted); }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .notice-block { display: grid; gap: 8px; padding: 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); }
    .notice-block--warn { border-color: rgba(251,191,36,0.32); background: rgba(251,191,36,0.08); }
    .notice-block--ok { border-color: rgba(34,197,94,0.3); background: rgba(34,197,94,0.08); }
    .notice-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
    .notice-head small, .notice-meta { color: var(--text-muted); font-size: 12px; }
    .notice-block p { margin: 0; line-height: 1.5; }
    .timeline { display: grid; gap: 14px; }
    .timeline-row { display: flex; gap: 12px; align-items: flex-start; padding: 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); }
    .timeline-dot { width: 10px; height: 10px; margin-top: 5px; border-radius: 999px; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.2); }
    .timeline-row--done .timeline-dot { background: var(--primary); border-color: var(--primary); }
    .timeline-row strong { display: block; margin-bottom: 4px; }
    .timeline-row small { color: var(--text-muted); line-height: 1.5; }
    @media (max-width: 1040px) {
      .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .workspace { grid-template-columns: 1fr; }
    }
    @media (max-width: 720px) {
      .hero, .summary-grid { grid-template-columns: 1fr; }
      .summary-grid { display: grid; }
    }
  `]
})
export class TenantKycComponent {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  readonly docTypes = ['AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'COLLEGE_ID'];

  profile = signal<Tenant | null>(null);
  saving = signal(false);
  replacementUploaded = signal(false);
  selectedFile = signal<File | null>(null);
  selectedFileName = computed(() => this.selectedFile()?.name || '');
  canUpload = computed(() => {
    const status = this.profile()?.kycStatus;
    return !status || status === 'NOT_SUBMITTED' || status === 'REPLACEMENT_REQUESTED';
  });
  showReplacementRequest = computed(() => this.profile()?.kycStatus === 'REPLACEMENT_REQUESTED' && !!this.profile()?.kycReplacementNotes);
  docType = 'AADHAAR';

  constructor() {
    this.load();
  }

  load() {
    this.api.tenantKycProfile().subscribe({
      next: profile => {
        this.profile.set(profile);
        this.replacementUploaded.set(false);
        this.selectedFile.set(null);
        if (profile.kycDocType) {
          this.docType = profile.kycDocType;
        }
      },
      error: err => this.snack.open(err?.message || 'Could not load KYC details', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' })
    });
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.selectedFile.set(input?.files?.[0] || null);
  }

  upload() {
    const file = this.selectedFile();
    const wasReplacement = this.profile()?.kycStatus === 'REPLACEMENT_REQUESTED';
    if (!file) {
      this.snack.open('Choose a document before uploading.', 'Dismiss', { duration: 2200, panelClass: 'pgms-snack' });
      return;
    }
    this.saving.set(true);
    this.api.uploadTenantKyc(this.docType, file).subscribe({
      next: profile => {
        this.saving.set(false);
        this.profile.set({
          ...profile,
          kycStatus: 'SUBMITTED',
          kycReplacementNotes: '',
          kycReplacementRequestedAt: '',
          kycReplacementRequestedByName: ''
        });
        this.replacementUploaded.set(wasReplacement);
        this.selectedFile.set(null);
        this.snack.open('KYC document uploaded', 'OK', { duration: 2200, panelClass: 'pgms-snack' });
      },
      error: err => {
        this.saving.set(false);
        this.snack.open(err?.message || 'Could not upload KYC document', 'Dismiss', { duration: 3200, panelClass: 'pgms-snack' });
      }
    });
  }

  viewDocument() {
    this.api.downloadTenantKycDocument().subscribe({
      next: blob => this.openBlob(blob),
      error: err => this.snack.open(err?.message || 'Could not open KYC document', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' })
    });
  }

  statusLabel(status?: string): string {
    if (status === 'VERIFIED') return 'Verified';
    if (status === 'REPLACEMENT_REQUESTED') return 'Replacement requested';
    if (status === 'SUBMITTED') return 'Submitted';
    return 'Pending';
  }

  statusCopy(profile: Tenant | null): string {
    if (!profile?.kycDocPath) return 'No document has been uploaded yet.';
    if (profile.kycStatus === 'VERIFIED') return `Verified by ${profile.kycVerifiedByName || 'manager'}.`;
    if (profile.kycStatus === 'REPLACEMENT_REQUESTED') return `Action needed: ${profile.kycReplacementNotes || 'Upload a replacement file.'}`;
    return 'Awaiting manager review.';
  }

  uploadLabel(): string {
    if (this.profile()?.kycStatus === 'REPLACEMENT_REQUESTED') return 'Upload replacement';
    return this.profile()?.kycDocPath ? 'Replace document' : 'Upload document';
  }

  uploadPanelTitle(): string {
    if (this.canUpload()) return this.profile()?.kycDocPath ? 'Replace document' : 'Submit document';
    if (this.profile()?.kycStatus === 'SUBMITTED') return this.replacementUploaded() ? 'Replacement submitted' : 'Document submitted';
    return 'Document on file';
  }

  private openBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
