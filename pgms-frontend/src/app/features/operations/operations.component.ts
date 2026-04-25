import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { MenuItem, NoticeReadReceipt, PG, Role } from '../../core/models';
import { PopupShellComponent } from '../../shared/popup-shell.component';

type ModuleKey = 'payments' | 'complaints' | 'notices' | 'vacate' | 'services' | 'amenities' | 'menu' | 'sublets';
type Row = Record<string, any>;

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'time' | 'textarea' | 'select' | 'checkbox';
  options?: string[];
  optionLabel?: (option: string) => string;
  show?: (role: Role | null) => boolean;
}

interface ActionConfig {
  label: string;
  icon: string;
  show: (row: Row, role: Role | null) => boolean;
  run: (row: Row) => void;
}

interface ModuleConfig {
  title: string;
  crumb: string;
  subtitle: string;
  columns: string[];
  createLabel?: string;
  fields?: FieldConfig[];
}

@Component({
  selector: 'app-operations',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PopupShellComponent],
  template: `
  <section class="ops fade-up">
    <header class="head">
      <div>
        <div class="crumb">{{ config().crumb }}</div>
        <h1>{{ config().title }}</h1>
        <p class="sub">{{ config().subtitle }}</p>
      </div>
      <button class="btn btn--primary" *ngIf="canCreate()" (click)="showForm.set(!showForm())">
        <mat-icon>{{ showForm() ? 'close' : 'add' }}</mat-icon>
        <span>{{ showForm() ? 'Close' : config().createLabel }}</span>
      </button>
    </header>

    @if (moduleKey() === 'sublets' && auth.role() === 'TENANT') {
      <div class="wallet card">
        <mat-icon>account_balance_wallet</mat-icon>
        <div>
          <div class="wallet-label">Credit wallet</div>
          <div class="wallet-value">₹{{ walletBalance() | number:'1.0-0' }}</div>
        </div>
      </div>
    }

    @if (showForm()) {
      <form class="form card" (ngSubmit)="submit()" data-testid="ops-form">
        @for (field of visibleFields(); track field.key) {
          <label class="fld" [class.wide]="field.type === 'textarea'">
            <span>{{ field.label }}</span>
            @if (field.type === 'textarea') {
              <textarea [(ngModel)]="form[field.key]" [name]="field.key"></textarea>
            } @else if (field.type === 'select') {
              <select [(ngModel)]="form[field.key]" [name]="field.key">
                @for (option of fieldOptions(field); track option) {
                  <option [value]="option">{{ optionLabel(field, option) }}</option>
                }
              </select>
            } @else if (field.type === 'checkbox') {
              <input type="checkbox" [(ngModel)]="form[field.key]" [name]="field.key" />
            } @else {
              <input [type]="field.type" [(ngModel)]="form[field.key]" [name]="field.key" />
            }
          </label>
        }
        @if (moduleKey() === 'menu') {
          <button type="button" class="btn" (click)="loadMenu()">Load week</button>
        }
        <button class="btn btn--primary" type="submit" [disabled]="saving()">
          <mat-icon>check</mat-icon>
          <span>{{ saving() ? 'Saving...' : 'Save' }}</span>
        </button>
      </form>
    }

    <div class="toolbar">
      <div class="search">
        <mat-icon>search</mat-icon>
        <input [(ngModel)]="query" name="query" placeholder="Search" />
      </div>
      <button class="btn btn--ghost" (click)="load()"><mat-icon>refresh</mat-icon><span>Refresh</span></button>
    </div>

    @if (loading()) {
      <div class="state card"><div class="spinner"></div><span>Loading {{ config().title.toLowerCase() }}...</span></div>
    } @else if (error()) {
      <div class="state card err"><mat-icon>error</mat-icon><span>{{ error() }}</span></div>
    } @else if (filteredRows().length === 0) {
      <div class="state card"><mat-icon>inbox</mat-icon><span>No records found.</span></div>
    } @else {
      <div class="table card" data-testid="ops-table">
        <div class="thead">
          @for (col of config().columns; track col) { <div>{{ label(col) }}</div> }
          <div>Actions</div>
        </div>
        @for (row of filteredRows(); track rowKey(row)) {
          <div class="tr">
            @for (col of config().columns; track col) {
              <div [class.money]="moneyColumn(col)">
                @if (statusColumn(col)) {
                  <span class="pill dot" [ngClass]="pillClass(row[col])">{{ row[col] || '-' }}</span>
                } @else {
                  {{ value(row, col) }}
                }
              </div>
            }
            <div class="actions">
              @for (action of actions(); track action.label) {
                @if (action.show(row, auth.role())) {
                  <button class="icon" type="button" (click)="action.run(row)" [title]="action.label" [class.action-pill]="moduleKey() === 'payments'">
                    <mat-icon>{{ action.icon }}</mat-icon>
                    @if (moduleKey() === 'payments') { <span>{{ action.label }}</span> }
                  </button>
                }
              }
            </div>
          </div>
        }
      </div>
    }
  </section>

  <app-popup-shell
    [open]="actionDialogOpen()"
    [eyebrow]="actionDialogEyebrow()"
    [title]="actionDialogTitle()"
    [subtitle]="actionDialogSubtitle()"
    (closed)="closeActionDialog()"
  >
    <label class="fld">
      <span>{{ actionDialogLabel() }}</span>
      @if (actionDialogType() === 'number') {
        <input type="number" [(ngModel)]="actionDialogValue" name="actionDialogValue" min="0" step="0.01" />
      } @else {
        <textarea [(ngModel)]="actionDialogValue" name="actionDialogValue"></textarea>
      }
    </label>
    <div class="dialog-actions">
      <button class="btn btn--ghost" type="button" (click)="closeActionDialog()">Cancel</button>
      <button class="btn btn--primary" type="button" (click)="submitActionDialog()">
        <mat-icon>check</mat-icon>
        <span>{{ actionDialogConfirmLabel() }}</span>
      </button>
    </div>
  </app-popup-shell>

  <app-popup-shell
    [open]="receiptsOpen()"
    eyebrow="Notices"
    [title]="selectedNoticeTitle() || 'Read receipts'"
    [subtitle]="receiptSummary()"
    (closed)="closeReceipts()"
  >
    @if (receiptsLoading()) {
      <div class="state"><div class="spinner"></div><span>Loading read receipts...</span></div>
    } @else if (receipts().length === 0) {
      <div class="state"><mat-icon>visibility_off</mat-icon><span>No read receipts yet.</span></div>
    } @else {
      <div class="receipt-list">
        @for (receipt of receipts(); track receipt.userId + '-' + receipt.readAt) {
          <div class="receipt-row">
            <div>
              <div class="receipt-name">{{ receipt.userName }}</div>
              <div class="receipt-meta">{{ receipt.role }}</div>
            </div>
            <div class="receipt-time">{{ receipt.readAt | date:'medium' }}</div>
          </div>
        }
      </div>
    }
  </app-popup-shell>
  `,
  styles: [`
    .ops { display: flex; flex-direction: column; gap: 18px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .crumb { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h1 { margin: 6px 0 2px; font-size: 28px; letter-spacing: -0.02em; }
    .sub { color: var(--text-muted); font-size: 13px; margin: 0; }
    .wallet { display: flex; align-items: center; gap: 14px; padding: 16px; width: fit-content; }
    .wallet mat-icon { color: var(--primary); }
    .wallet-label { color: var(--text-muted); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; }
    .wallet-value { font-size: 26px; font-weight: 800; font-family: var(--font-mono); }
    .form { display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 12px; padding: 16px; align-items: end; }
    @media (max-width: 960px) { .form { grid-template-columns: 1fr; } }
    .fld { display: flex; flex-direction: column; gap: 6px; }
    .fld.wide { grid-column: span 2; }
    .fld span { font-size: 11px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; }
    input, select, textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 10px; padding: 10px 12px; font-family: inherit; }
    textarea { min-height: 84px; resize: vertical; }
    input[type="checkbox"] { width: 18px; height: 18px; }
    .toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; }
    .search { display: flex; align-items: center; gap: 8px; min-width: 280px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 0 12px; }
    .search mat-icon { color: var(--text-muted); font-size: 18px; width: 18px; height: 18px; }
    .search input { border: 0; background: transparent; padding: 11px 0; }
    .table { overflow: auto; }
    .thead, .tr { display: grid; grid-template-columns: repeat(var(--cols, 6), minmax(140px, 1fr)) 180px; gap: 10px; align-items: center; min-width: 900px; }
    .thead { padding: 12px 16px; color: var(--text-muted); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid var(--border); }
    .tr { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; }
    .tr:last-child { border-bottom: 0; }
    .money { font-family: var(--font-mono); }
    .actions { display: flex; gap: 6px; justify-content: flex-end; }
    .icon { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; border: 1px solid var(--border); background: var(--bg-elev); color: var(--text-muted); cursor: pointer; }
    .icon:hover { color: var(--primary); border-color: var(--primary); }
    .icon mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .action-pill { width: auto; height: 34px; display: inline-flex; align-items: center; gap: 6px; padding: 0 10px; }
    .action-pill span { font-size: 12px; font-weight: 600; }
    .state { min-height: 180px; display: grid; place-items: center; gap: 10px; padding: 28px; color: var(--text-muted); text-align: center; }
    .state.err { color: var(--danger); }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.9s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .pill--paid, .pill--resolved, .pill--completed, .pill--approved { background: var(--status-vacant-bg); border-color: var(--status-vacant-border); color: var(--status-vacant-text); }
    .pill--pending, .pill--requested, .pill--open { background: var(--status-vacating-bg); border-color: var(--status-vacating-border); color: var(--status-vacating-text); }
    .pill--overdue, .pill--rejected, .pill--escalated { background: rgba(248,113,113,0.14); border-color: rgba(248,113,113,0.5); color: var(--danger); }
    .pill--partial, .pill--confirmed, .pill--in_progress { background: var(--status-occupied-bg); border-color: var(--status-occupied-border); color: var(--status-occupied-text); }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 10px; }
    .receipt-list { display: flex; flex-direction: column; gap: 10px; }
    .receipt-row { display: flex; justify-content: space-between; gap: 14px; align-items: center; padding: 12px 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); }
    .receipt-name { font-weight: 600; }
    .receipt-meta, .receipt-time { color: var(--text-muted); font-size: 12px; }
    .receipt-time { text-align: right; }
  `],
  host: { '[style.--cols]': 'config().columns.length' }
})
export class OperationsComponent {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  auth = inject(AuthService);

  rows = signal<Row[]>([]);
  pgs = signal<PG[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  showForm = signal(false);
  walletBalance = signal(0);
  actionDialogOpen = signal(false);
  actionDialogTitle = signal('');
  actionDialogSubtitle = signal('');
  actionDialogEyebrow = signal('');
  actionDialogLabel = signal('');
  actionDialogType = signal<'text' | 'number'>('text');
  actionDialogConfirmLabel = signal('Save');
  receiptsOpen = signal(false);
  receiptsLoading = signal(false);
  selectedNoticeTitle = signal('');
  receipts = signal<NoticeReadReceipt[]>([]);
  query = '';
  form: Row = {};
  actionDialogValue = '';
  private textActionFactory: ((value: string) => { subscribe: (handlers: { next: () => void; error: (err: any) => void }) => void }) | null = null;
  private numberActionFactory: ((value: number) => { subscribe: (handlers: { next: () => void; error: (err: any) => void }) => void }) | null = null;

  moduleKey = computed(() => this.route.snapshot.data['module'] as ModuleKey);
  config = computed(() => this.moduleConfig(this.moduleKey()));
  visibleFields = computed(() => (this.config().fields || []).filter(field => !field.show || field.show(this.auth.role())));
  filteredRows = computed(() => {
    const q = this.query.toLowerCase().trim();
    if (!q) return this.rows();
    return this.rows().filter(row => JSON.stringify(row).toLowerCase().includes(q));
  });
  canCreate = computed(() => !!this.config().fields?.length && !!this.config().createLabel);
  actions = computed<ActionConfig[]>(() => this.moduleActions(this.moduleKey()));

  constructor() {
    this.api.listPgs().subscribe({
      next: pgs => {
        this.pgs.set(pgs);
        if (!this.form['pgId'] && pgs.length) this.form['pgId'] = pgs[0].id;
        if (this.moduleKey() === 'menu') this.load();
      },
      error: () => undefined
    });
    this.resetForm();
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    const key = this.moduleKey();
    const request: Observable<unknown> = key === 'payments' ? this.api.listPayments()
      : key === 'complaints' ? this.api.listComplaints()
      : key === 'notices' ? this.api.listNotices()
      : key === 'vacate' ? this.api.listVacates()
      : key === 'services' ? this.api.listServices()
      : key === 'amenities' ? this.api.listAmenities()
      : key === 'sublets' ? this.api.listSublets()
      : this.api.listMenu(this.numberField('pgId') || this.pgs()[0]?.id || 0, this.form['weekLabel'] || this.weekLabel());
    request.subscribe({
      next: rows => {
        this.rows.set(Array.isArray(rows) ? rows as Row[] : []);
        this.loading.set(false);
        if (key === 'sublets' && this.auth.role() === 'TENANT') this.loadWallet();
      },
      error: (err: { message?: string }) => {
        this.error.set(err?.message || 'Could not load data');
        this.loading.set(false);
      }
    });
  }

  loadMenu() { this.load(); }

  submit() {
    this.saving.set(true);
    const key = this.moduleKey();
    const request: Observable<unknown> = key === 'payments' && this.auth.role() === 'MANAGER'
      ? this.api.cashPayment({ tenantProfileId: this.numberField('tenantProfileId'), billingMonth: this.form['billingMonth'], amount: this.numberField('amount') })
      : key === 'complaints'
        ? this.api.createComplaint({ category: this.form['category'], description: this.form['description'], attachmentPath: this.form['attachmentPath'] })
        : key === 'notices'
          ? this.api.createNotice({ title: this.form['title'], content: this.form['content'], targetType: this.form['targetType'], targetPgId: this.optionalNumber('targetPgId'), targetUserId: this.optionalNumber('targetUserId') })
          : key === 'vacate'
            ? this.api.createVacate({ intendedVacateDate: this.form['intendedVacateDate'], hasReferral: !!this.form['hasReferral'], referralName: this.form['referralName'], referralPhone: this.form['referralPhone'], referralEmail: this.form['referralEmail'] })
            : key === 'services'
              ? this.api.createService({ serviceType: this.form['serviceType'], preferredDate: this.form['preferredDate'], preferredTimeWindow: this.form['preferredTimeWindow'] })
              : key === 'amenities' && this.auth.role() === 'MANAGER'
                ? this.api.createAmenitySlot({ pgId: this.numberField('pgId'), amenityType: this.form['amenityType'], slotDate: this.form['slotDate'], startTime: this.form['startTime'], endTime: this.form['endTime'], capacity: this.numberField('capacity'), facilityName: this.form['facilityName'] })
                : key === 'sublets'
                  ? this.api.createSublet({ startDate: this.form['startDate'], endDate: this.form['endDate'], reason: this.form['reason'] })
                  : this.api.saveMenu(this.menuPayload());
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.resetForm();
        this.snack.open('Saved', 'OK', { duration: 2000, panelClass: 'pgms-snack' });
        this.load();
      },
      error: (err: { message?: string }) => {
        this.saving.set(false);
        this.snack.open(err?.message || 'Save failed', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' });
      }
    });
  }

  value(row: Row, col: string): string {
    const value = row[col];
    if (value === undefined || value === null || value === '') return '-';
    if (col === 'pgId') return this.pgName(String(value));
    if (typeof value === 'number' && this.moneyColumn(col)) return `₹${value.toLocaleString('en-IN')}`;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }

  rowKey(row: Row): string {
    return String(row['id'] ?? row['bookingId'] ?? row['slotId'] ?? JSON.stringify(row));
  }

  label(col: string): string {
    const labels: Record<string, string> = {
      tenantName: 'Tenant',
      roomNumber: 'Room',
      billingMonth: 'Month',
      totalDue: 'Due',
      amountPaid: 'Paid',
      fineAccrued: 'Fine',
      remainingAmountDue: 'Pending',
      dueDate: 'Due Date',
      bookingCount: 'Booked'
    };
    return labels[col] || col.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
  }

  fieldOptions(field: FieldConfig): string[] { return field.options || []; }
  optionLabel(field: FieldConfig, option: string): string { return field.optionLabel ? field.optionLabel(option) : option; }

  moneyColumn(col: string): boolean {
    return ['amount', 'rentAmount', 'fineAccrued', 'amountPaid', 'totalDue', 'remainingAmountDue', 'advanceRefundAmount'].some(key => col.includes(key));
  }

  statusColumn(col: string): boolean { return col === 'status'; }
  pillClass(status: unknown): string { return `pill--${String(status || '').toLowerCase()}`; }

  private moduleConfig(key: ModuleKey): ModuleConfig {
    const role = this.auth.role();
    const configs: Record<ModuleKey, ModuleConfig> = {
      payments: {
        crumb: 'Finance',
        title: 'Payments',
        subtitle: role === 'TENANT' ? 'Rent dues, payment history and wallet credits.' : 'Rent collection, pending dues and fine handling.',
        columns: role === 'TENANT'
          ? ['billingMonth', 'totalDue', 'amountPaid', 'fineAccrued', 'remainingAmountDue', 'dueDate', 'status']
          : ['tenantName', 'roomNumber', 'billingMonth', 'totalDue', 'amountPaid', 'fineAccrued', 'status'],
        fields: []
      },
      complaints: {
        crumb: 'Support',
        title: 'Complaints',
        subtitle: role === 'TENANT' ? 'Raise and track complaints.' : 'Track complaint SLA, ownership and resolution.',
        columns: ['id', 'tenantName', 'roomNumber', 'category', 'status', 'createdAt', 'notes'],
        createLabel: role === 'TENANT' ? 'Raise complaint' : undefined,
        fields: role === 'TENANT' ? [
          { key: 'category', label: 'Category', type: 'select', options: ['MAINTENANCE', 'NOISE', 'HYGIENE', 'FOOD', 'OTHER', 'AGAINST_MANAGER'] },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'attachmentPath', label: 'Attachment path', type: 'text' }
        ] : []
      },
      notices: {
        crumb: 'Communication',
        title: 'Notices',
        subtitle: 'Announcements with read tracking.',
        columns: ['title', 'targetType', 'createdByName', 'createdAt', 'read', 'readCount'],
        createLabel: role === 'OWNER' || role === 'MANAGER' ? 'Compose notice' : undefined,
        fields: role === 'OWNER' || role === 'MANAGER' ? [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'content', label: 'Content', type: 'textarea' },
          { key: 'targetType', label: 'Target', type: 'select', options: role === 'OWNER' ? ['ALL_PGS', 'SPECIFIC_PG', 'ALL_MANAGERS', 'SPECIFIC_TENANT'] : ['SPECIFIC_PG', 'SPECIFIC_TENANT'] },
          { key: 'targetPgId', label: 'Target PG ID', type: 'number' },
          { key: 'targetUserId', label: 'Target user ID', type: 'number' }
        ] : []
      },
      vacate: {
        crumb: 'Lifecycle',
        title: 'Vacate Notices',
        subtitle: role === 'TENANT' ? 'Submit and track your vacate request.' : 'Manage vacate notices, referrals and checkout.',
        columns: ['tenantName', 'roomNumber', 'intendedVacateDate', 'status', 'refundEligible', 'advanceRefundAmount', 'referralName'],
        createLabel: role === 'TENANT' ? 'Request vacate' : undefined,
        fields: role === 'TENANT' ? [
          { key: 'intendedVacateDate', label: 'Vacate date', type: 'date' },
          { key: 'hasReferral', label: 'Has referral', type: 'checkbox' },
          { key: 'referralName', label: 'Referral name', type: 'text' },
          { key: 'referralPhone', label: 'Referral phone', type: 'text' },
          { key: 'referralEmail', label: 'Referral email', type: 'text' }
        ] : []
      },
      services: {
        crumb: 'Operations',
        title: 'Service Bookings',
        subtitle: role === 'TENANT' ? 'Book cleaning and maintenance services.' : 'Confirm, complete and track service quality.',
        columns: ['tenantName', 'roomNumber', 'serviceType', 'preferredDate', 'preferredTimeWindow', 'status', 'rating'],
        createLabel: role === 'TENANT' ? 'Book service' : undefined,
        fields: role === 'TENANT' ? [
          { key: 'serviceType', label: 'Service type', type: 'select', options: ['ROOM_CLEANING', 'LINEN_CHANGE', 'PEST_CONTROL', 'PLUMBING_INSPECTION', 'ELECTRICAL_CHECK'] },
          { key: 'preferredDate', label: 'Preferred date', type: 'date' },
          { key: 'preferredTimeWindow', label: 'Time window', type: 'text' }
        ] : []
      },
      amenities: {
        crumb: 'Bookings',
        title: 'Amenities',
        subtitle: role === 'TENANT' ? 'Book shared slots and join open invites.' : 'Configure slots and monitor utilization.',
        columns: role === 'TENANT'
          ? ['facilityName', 'amenityType', 'slotDate', 'startTime', 'endTime', 'capacity', 'bookingCount']
          : ['pgId', 'amenityType', 'facilityName', 'slotDate', 'startTime', 'endTime', 'capacity', 'bookingCount', 'status'],
        createLabel: role === 'MANAGER' ? 'Create slot' : undefined,
        fields: role === 'MANAGER' ? [
          { key: 'pgId', label: 'PG', type: 'select', options: this.pgs().map(pg => String(pg.id)), optionLabel: option => this.pgName(option) },
          { key: 'amenityType', label: 'Amenity', type: 'select', options: ['WASHING_MACHINE', 'GAME_ROOM', 'TT', 'CARROM', 'BADMINTON'] },
          { key: 'facilityName', label: 'Facility name', type: 'text' },
          { key: 'slotDate', label: 'Date', type: 'date' },
          { key: 'startTime', label: 'Start', type: 'time' },
          { key: 'endTime', label: 'End', type: 'time' },
          { key: 'capacity', label: 'Capacity', type: 'number' }
        ] : []
      },
      menu: {
        crumb: 'Meals',
        title: 'Weekly Menu',
        subtitle: 'View and publish meal plans by PG and week.',
        columns: ['pgId', 'weekLabel', 'dayOfWeek', 'mealType', 'itemNames', 'isVeg'],
        createLabel: role === 'OWNER' || role === 'MANAGER' ? 'Edit meal' : undefined,
        fields: [
          { key: 'pgId', label: 'PG ID', type: 'number' },
          { key: 'weekLabel', label: 'Week label', type: 'text' },
          { key: 'dayOfWeek', label: 'Day', type: 'select', options: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'], show: r => r === 'OWNER' || r === 'MANAGER' },
          { key: 'mealType', label: 'Meal', type: 'select', options: ['BREAKFAST', 'LUNCH', 'DINNER'], show: r => r === 'OWNER' || r === 'MANAGER' },
          { key: 'itemNames', label: 'Items', type: 'text', show: r => r === 'OWNER' || r === 'MANAGER' },
          { key: 'isVeg', label: 'Veg', type: 'checkbox', show: r => r === 'OWNER' || r === 'MANAGER' }
        ]
      },
      sublets: {
        crumb: 'Credits',
        title: 'Sublets',
        subtitle: role === 'TENANT' ? 'Request a temporary sublet and earn wallet credit.' : 'Approve sublets and complete guest checkout.',
        columns: ['tenantName', 'roomNumber', 'startDate', 'endDate', 'status', 'guestName', 'checkInDate', 'checkOutDate'],
        createLabel: role === 'TENANT' ? 'Request sublet' : undefined,
        fields: role === 'TENANT' ? [
          { key: 'startDate', label: 'Start date', type: 'date' },
          { key: 'endDate', label: 'End date', type: 'date' },
          { key: 'reason', label: 'Reason', type: 'textarea' }
        ] : []
      }
    };
    return configs[key];
  }

  private moduleActions(key: ModuleKey): ActionConfig[] {
    const actions: Record<ModuleKey, ActionConfig[]> = {
      payments: [
        { label: 'Pay', icon: 'payments', show: row => this.auth.role() === 'TENANT' && row['remainingAmountDue'] > 0, run: row => this.openNumberDialog('Pay rent', 'Submit your rent payment from your tenant account.', 'Amount', 'Pay now', amount => this.api.payRent(row['id'], amount)) },
        { label: 'Apply credit', icon: 'account_balance_wallet', show: row => this.auth.role() === 'TENANT' && row['remainingAmountDue'] > 0, run: row => this.mutate(this.api.applyCredit(row['id'])) },
        { label: 'Waive fine', icon: 'money_off', show: row => this.auth.role() === 'MANAGER' && row['fineAccrued'] > 0, run: row => this.openTextDialog('Waive fine', 'Add a short reason for the waiver.', 'Reason', 'Waive fine', reason => this.api.waiveFine(row['id'], reason)) }
      ],
      complaints: [
        { label: 'In progress', icon: 'hourglass_top', show: row => this.auth.role() !== 'TENANT' && row['status'] !== 'RESOLVED', run: row => this.mutate(this.api.updateComplaint(row['id'], 'IN_PROGRESS', 'Work started')) },
        { label: 'Resolve', icon: 'task_alt', show: row => this.auth.role() !== 'TENANT' && row['status'] !== 'RESOLVED', run: row => this.openTextDialog('Resolve complaint', 'Share the resolution details for the tenant.', 'Resolution notes', 'Resolve', notes => this.api.updateComplaint(row['id'], 'RESOLVED', notes)) },
        { label: 'Read', icon: 'visibility', show: () => false, run: () => undefined }
      ],
      notices: [
        { label: 'Mark read', icon: 'done_all', show: row => !row['read'], run: row => this.mutate(this.api.markNoticeRead(row['id'])) },
        { label: 'Receipts', icon: 'visibility', show: () => this.auth.role() !== 'TENANT', run: row => this.showReceipts(row['id'], row['title']) }
      ],
      vacate: [
        { label: 'Approve referral', icon: 'how_to_reg', show: row => this.auth.role() === 'MANAGER' && row['referralName'] && row['status'] === 'PENDING', run: row => this.mutate(this.api.approveVacateReferral(row['id'], true)) },
        { label: 'Reject referral', icon: 'person_remove', show: row => this.auth.role() === 'MANAGER' && row['referralName'] && row['status'] === 'PENDING', run: row => this.mutate(this.api.approveVacateReferral(row['id'], false)) },
        { label: 'Checkout', icon: 'logout', show: row => this.auth.role() === 'MANAGER' && row['status'] !== 'CHECKED_OUT', run: row => this.mutate(this.api.checkoutVacate(row['id'])) }
      ],
      services: [
        { label: 'Confirm', icon: 'event_available', show: row => this.auth.role() === 'MANAGER' && row['status'] === 'REQUESTED', run: row => this.mutate(this.api.updateService(row['id'], 'CONFIRMED', 'Confirmed')) },
        { label: 'Complete', icon: 'task_alt', show: row => this.auth.role() === 'MANAGER' && row['status'] !== 'COMPLETED', run: row => this.mutate(this.api.updateService(row['id'], 'COMPLETED', 'Completed')) },
        { label: 'Rate', icon: 'star', show: row => this.auth.role() === 'TENANT' && row['status'] === 'COMPLETED' && !row['rating'], run: row => this.openNumberDialog('Rate service', 'Give a score between 1 and 5.', 'Rating', 'Submit rating', rating => this.api.rateService(row['id'], rating, 'Rated from app')) }
      ],
      amenities: [
        { label: 'Book', icon: 'event', show: row => this.auth.role() === 'TENANT' && !row['bookingId'], run: row => this.mutate(this.api.bookAmenity(row['slotId'], false)) },
        { label: 'Open invite', icon: 'groups', show: row => this.auth.role() === 'TENANT' && !row['bookingId'], run: row => this.mutate(this.api.bookAmenity(row['slotId'], true)) },
        { label: 'Join', icon: 'group_add', show: row => this.auth.role() === 'TENANT' && row['openInvite'], run: row => this.mutate(this.api.joinAmenityInvite(row['slotId'])) },
        { label: 'Cancel', icon: 'event_busy', show: row => this.auth.role() === 'TENANT' && row['bookingId'], run: row => this.mutate(this.api.cancelAmenity(row['bookingId'])) }
      ],
      menu: [],
      sublets: [
        { label: 'Approve', icon: 'check_circle', show: row => this.auth.role() === 'MANAGER' && row['status'] === 'PENDING', run: row => this.mutate(this.api.approveSublet(row['id'])) },
        { label: 'Complete', icon: 'task_alt', show: row => this.auth.role() === 'MANAGER' && row['status'] === 'APPROVED', run: row => this.openTextDialog('Complete sublet', 'Add the guest name to finish the check-in.', 'Guest name', 'Complete', guestName => this.api.completeSublet(row['id'], { guestName, guestPhone: '9000000000', checkInDate: new Date().toISOString().slice(0, 10) })) }
      ]
    };
    return actions[key];
  }

  private resetForm() {
    this.form = {
      category: 'MAINTENANCE',
      targetType: 'ALL_PGS',
      serviceType: 'ROOM_CLEANING',
      amenityType: 'WASHING_MACHINE',
      weekLabel: this.weekLabel(),
      dayOfWeek: 'MONDAY',
      mealType: 'BREAKFAST',
      isVeg: true,
      pgId: this.pgs()[0]?.id
    };
  }

  private menuPayload(): MenuItem[] {
    return [{
      pgId: this.numberField('pgId') || this.pgs()[0]?.id || 0,
      weekLabel: this.form['weekLabel'] || this.weekLabel(),
      dayOfWeek: this.form['dayOfWeek'],
      mealType: this.form['mealType'],
      itemNames: this.form['itemNames'],
      isVeg: !!this.form['isVeg']
    }];
  }

  private weekLabel(): string {
    const now = new Date();
    const start = new Date(Date.UTC(now.getFullYear(), 0, 1));
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const day = start.getUTCDay() || 7;
    const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
    const week = Math.ceil((diff + day) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  private loadWallet() {
    this.api.wallet().subscribe({ next: wallet => this.walletBalance.set(wallet.creditWalletBalance || 0), error: () => undefined });
  }

  private pgName(value: string): string {
    const id = Number(value);
    return this.pgs().find(pg => pg.id === id)?.name || `PG ${value}`;
  }

  private numberField(key: string): number { return Number(this.form[key] || 0); }
  private optionalNumber(key: string): number | undefined {
    const value = Number(this.form[key]);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

  private mutate(request: { subscribe: (handlers: { next: () => void; error: (err: any) => void }) => void }) {
    request.subscribe({
      next: () => { this.snack.open('Updated', 'OK', { duration: 1800, panelClass: 'pgms-snack' }); this.load(); },
      error: err => this.snack.open(err?.message || 'Action failed', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' })
    });
  }

  private openTextDialog(title: string, subtitle: string, label: string, confirmLabel: string, factory: (value: string) => { subscribe: (handlers: { next: () => void; error: (err: any) => void }) => void }) {
    this.textActionFactory = factory;
    this.numberActionFactory = null;
    this.actionDialogEyebrow.set(this.config().title);
    this.actionDialogTitle.set(title);
    this.actionDialogSubtitle.set(subtitle);
    this.actionDialogLabel.set(label);
    this.actionDialogConfirmLabel.set(confirmLabel);
    this.actionDialogType.set('text');
    this.actionDialogValue = '';
    this.actionDialogOpen.set(true);
  }

  private openNumberDialog(title: string, subtitle: string, label: string, confirmLabel: string, factory: (value: number) => { subscribe: (handlers: { next: () => void; error: (err: any) => void }) => void }) {
    this.numberActionFactory = factory;
    this.textActionFactory = null;
    this.actionDialogEyebrow.set(this.config().title);
    this.actionDialogTitle.set(title);
    this.actionDialogSubtitle.set(subtitle);
    this.actionDialogLabel.set(label);
    this.actionDialogConfirmLabel.set(confirmLabel);
    this.actionDialogType.set('number');
    this.actionDialogValue = '';
    this.actionDialogOpen.set(true);
  }

  closeActionDialog() {
    this.actionDialogOpen.set(false);
    this.textActionFactory = null;
    this.numberActionFactory = null;
    this.actionDialogValue = '';
  }

  submitActionDialog() {
    const raw = this.actionDialogValue.trim();
    if (!raw) {
      this.snack.open('Please enter a value.', 'Dismiss', { duration: 2200, panelClass: 'pgms-snack' });
      return;
    }
    if (this.actionDialogType() === 'number') {
      if (!this.numberActionFactory) return;
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) {
        this.snack.open('Enter a valid amount.', 'Dismiss', { duration: 2200, panelClass: 'pgms-snack' });
        return;
      }
      const request = this.numberActionFactory(value);
      this.closeActionDialog();
      this.mutate(request);
      return;
    }
    if (!this.textActionFactory) return;
    const request = this.textActionFactory(raw);
    this.closeActionDialog();
    this.mutate(request);
  }

  closeReceipts() {
    this.receiptsOpen.set(false);
    this.receipts.set([]);
    this.receiptsLoading.set(false);
    this.selectedNoticeTitle.set('');
  }

  receiptSummary(): string {
    if (this.receiptsLoading()) return 'Checking who has opened this notice.';
    const count = this.receipts().length;
    return count ? `${count} receipt${count === 1 ? '' : 's'} captured.` : 'No one has marked this notice as read yet.';
  }

  private showReceipts(noticeId: number, title?: string) {
    this.receiptsOpen.set(true);
    this.receiptsLoading.set(true);
    this.selectedNoticeTitle.set(title || 'Read receipts');
    this.receipts.set([]);
    this.api.noticeReceipts(noticeId).subscribe({
      next: receipts => {
        this.receipts.set(receipts);
        this.receiptsLoading.set(false);
      },
      error: err => {
        this.receiptsLoading.set(false);
        this.snack.open(err?.message || 'Could not load read receipts', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' });
      }
    });
  }
}
