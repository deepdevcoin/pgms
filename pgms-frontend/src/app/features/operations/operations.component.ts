import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { MenuItem, NoticeReadReceipt, PaymentSummary, PaymentTransaction, PG, Role, Tenant } from '../../core/models';
import { PopupShellComponent } from '../../shared/popup-shell.component';
import { buildModuleActions, buildModuleConfig, OperationsActionHandlers } from './operations.config';
import { buildPaymentSummaryCards, formatRowValue, formatTransactionValue, isMoneyColumn, isStatusColumn, labelForColumn, pillClassForStatus, transactionColumns } from './operations.formatters';
import { OperationsFormComponent } from './operations-form.component';
import { OperationsHeaderComponent } from './operations-header.component';
import { OperationsPaymentOverviewComponent } from './operations-payment-overview.component';
import { OperationsTableComponent } from './operations-table.component';
import { ActionConfig, ModuleKey, Row } from './operations.types';

@Component({
  selector: 'app-operations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    PopupShellComponent,
    OperationsHeaderComponent,
    OperationsFormComponent,
    OperationsTableComponent,
    OperationsPaymentOverviewComponent
  ],
  template: `
  <section class="ops fade-up">
    <app-operations-header
      [crumb]="config().crumb"
      [title]="config().title"
      [subtitle]="config().subtitle"
      [createLabel]="config().createLabel || ''"
      [formOpen]="showForm()"
      [showToggle]="canCreate()"
      (toggleCreate)="showForm.set(!showForm())"
    />

    @if (auth.role() === 'TENANT' && (moduleKey() === 'payments' || moduleKey() === 'sublets')) {
      <div class="wallet card">
        <mat-icon>account_balance_wallet</mat-icon>
        <div>
          <div class="wallet-label">Credit wallet</div>
          <div class="wallet-value">₹{{ walletBalance() | number:'1.0-0' }}</div>
          <div class="wallet-meta">
            @if (moduleKey() === 'payments') {
              Use wallet against pending rent. It applies only what is needed.
            } @else {
              Wallet credit from sublets is available here.
            }
          </div>
        </div>
      </div>
    }

    @if (moduleKey() === 'payments') {
      <app-operations-payment-overview
        [summaryCards]="paymentSummaryCards()"
        [showLedger]="false"
      />
    }

    @if (showForm()) {
      <app-operations-form
        [fields]="visibleFields()"
        [form]="form"
        [saving]="saving()"
        [showLoadWeek]="moduleKey() === 'menu'"
        (submitForm)="submit()"
        (loadWeek)="loadMenu()"
      />
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
    } @else if (moduleKey() === 'menu' && auth.role() === 'TENANT') {
      @if (weeklyTenantMenu().length === 0) {
        <div class="state card"><mat-icon>restaurant_menu</mat-icon><span>Weekly menu is not available for your PG yet.</span></div>
      } @else {
        <section class="menu-board">
          @for (day of weeklyTenantMenu(); track day.day) {
            <article class="menu-day card" [class.menu-day--today]="day.isToday">
              <div class="menu-day-head">
                <div>
                  <div class="menu-day-name">{{ day.day }}</div>
                  <div class="menu-day-week">{{ day.weekLabel }}</div>
                </div>
                @if (day.isToday) {
                  <span class="menu-day-tag">Today</span>
                }
              </div>

              <div class="menu-meals">
                @for (meal of day.meals; track meal.id || (meal.dayOfWeek + '-' + meal.mealType + '-' + meal.itemNames)) {
                  <div class="menu-meal">
                    <div class="menu-meal-copy">
                      <div class="menu-meal-name">{{ meal.mealType }}</div>
                      <div class="menu-meal-items">{{ meal.itemNames }}</div>
                    </div>
                    <span class="menu-meal-tag" [class.menu-meal-tag--veg]="meal.isVeg">{{ meal.isVeg ? 'Veg' : 'Mixed' }}</span>
                  </div>
                }
              </div>
            </article>
          }
        </section>
      }
    } @else if (filteredRows().length === 0) {
      <div class="state card"><mat-icon>inbox</mat-icon><span>No records found.</span></div>
    } @else {
      <app-operations-table
        [columns]="config().columns"
        [rows]="filteredRows()"
        [actions]="actions()"
        [role]="auth.role()"
        [moduleKey]="moduleKey()"
        [compact]="moduleKey() === 'payments'"
        [minWidth]="moduleKey() === 'payments' ? '100%' : ''"
        [label]="label.bind(this)"
        [value]="value.bind(this)"
        [rowKey]="rowKey.bind(this)"
        [moneyColumn]="moneyColumn.bind(this)"
        [statusColumn]="statusColumn.bind(this)"
        [pillClass]="pillClass.bind(this)"
      />

      @if (moduleKey() === 'payments') {
        <app-operations-payment-overview
          [showSummary]="false"
          [transactions]="filteredTransactions()"
          [columns]="transactionColumns()"
          [label]="label.bind(this)"
          [transactionValue]="transactionValue.bind(this)"
          [moneyColumn]="moneyColumn.bind(this)"
        />
      }
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
    .wallet { display: flex; align-items: center; gap: 14px; padding: 16px; width: fit-content; }
    .wallet mat-icon { color: var(--primary); }
    .wallet-label { color: var(--text-muted); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; }
    .wallet-value { font-size: 26px; font-weight: 800; font-family: var(--font-mono); }
    .wallet-meta { margin-top: 4px; color: var(--text-muted); font-size: 12px; line-height: 1.45; max-width: 320px; }
    .toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; }
    .search { display: flex; align-items: center; gap: 8px; min-width: 280px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 0 12px; }
    .search mat-icon { color: var(--text-muted); font-size: 18px; width: 18px; height: 18px; }
    .search input { border: 0; background: transparent; padding: 11px 0; }
    .state { min-height: 180px; display: grid; place-items: center; gap: 10px; padding: 28px; color: var(--text-muted); text-align: center; }
    .state.err { color: var(--danger); }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.9s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .fld { display: flex; flex-direction: column; gap: 8px; }
    .fld span { color: var(--text-muted); font-size: 12px; font-weight: 600; }
    .fld input, .fld textarea {
      width: 100%;
      background: var(--bg-elev);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 12px;
      padding: 12px 14px;
      font-family: inherit;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
    }
    .fld textarea { min-height: 108px; resize: vertical; line-height: 1.5; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 10px; }
    .receipt-list { display: flex; flex-direction: column; gap: 10px; }
    .receipt-row { display: flex; justify-content: space-between; gap: 14px; align-items: center; padding: 12px 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); }
    .receipt-name { font-weight: 600; }
    .receipt-meta, .receipt-time { color: var(--text-muted); font-size: 12px; }
    .receipt-time { text-align: right; }
    .menu-board { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .menu-day { padding: 16px; display: grid; gap: 14px; }
    .menu-day--today {
      background:
        linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02)),
        linear-gradient(135deg, rgba(96,165,250,0.12), transparent 44%);
    }
    .menu-day-head { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
    .menu-day-name { font-size: 16px; font-weight: 700; }
    .menu-day-week { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
    .menu-day-tag, .menu-meal-tag {
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      background: rgba(255,255,255,0.06);
      color: var(--text-muted);
    }
    .menu-meal-tag--veg { background: rgba(34,197,94,0.12); color: #86efac; }
    .menu-meals { display: grid; gap: 10px; }
    .menu-meal {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
      padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .menu-meal:first-child { padding-top: 0; border-top: 0; }
    .menu-meal-copy { display: grid; gap: 4px; }
    .menu-meal-name { font-size: 11px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; }
    .menu-meal-items { line-height: 1.5; }
    @media (max-width: 900px) { .menu-board { grid-template-columns: 1fr; } }
    @media (max-width: 640px) { .menu-meal { grid-template-columns: 1fr; } }
  `],
  host: {}
})
export class OperationsComponent {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  auth = inject(AuthService);

  rows = signal<Row[]>([]);
  pgs = signal<PG[]>([]);
  tenantProfile = signal<Tenant | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  showForm = signal(false);
  walletBalance = signal(0);
  paymentSummary = signal<PaymentSummary | null>(null);
  paymentTransactions = signal<PaymentTransaction[]>([]);
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
  actionDialogValue: string | number = '';
  private textActionFactory: ((value: string) => { subscribe: (handlers: { next: () => void; error: (err: any) => void }) => void }) | null = null;
  private numberActionFactory: ((value: number) => { subscribe: (handlers: { next: () => void; error: (err: any) => void }) => void }) | null = null;
  private actionHandlers: OperationsActionHandlers = {
    payRent: row => this.openNumberDialog('Pay rent', 'Submit your rent payment from your tenant account.', 'Amount', 'Pay now', amount => this.api.payRent(row['id'], amount)),
    applyCredit: row => {
      const maxWalletUse = Math.min(Number(row['walletAvailable'] || 0), Number(row['remainingAmountDue'] || 0));
      this.openNumberDialog(
        'Use wallet credit',
        `Available to use now: ${this.money(maxWalletUse)}. We will apply only the amount you enter.`,
        'Wallet amount',
        'Apply wallet',
        amount => this.api.applyCredit(row['id'], amount),
        maxWalletUse
      );
    },
    waiveFine: row => this.openTextDialog('Waive fine', 'Add a short reason for the waiver.', 'Reason', 'Waive fine', reason => this.api.waiveFine(row['id'], reason)),
    complaintInProgress: row => this.mutate(this.api.updateComplaint(row['id'], 'IN_PROGRESS', 'Work started')),
    complaintResolve: row => this.openTextDialog('Resolve complaint', 'Share the resolution details for the tenant.', 'Resolution notes', 'Resolve', notes => this.api.updateComplaint(row['id'], 'RESOLVED', notes)),
    noticeMarkRead: row => this.mutate(this.api.markNoticeRead(row['id'])),
    noticeReceipts: row => this.showReceipts(row['id'], row['title']),
    vacateApprove: row => this.mutate(this.api.approveVacateReferral(row['id'], true)),
    vacateReject: row => this.mutate(this.api.approveVacateReferral(row['id'], false)),
    vacateCheckout: row => this.mutate(this.api.checkoutVacate(row['id'])),
    serviceConfirm: row => this.mutate(this.api.updateService(row['id'], 'CONFIRMED', 'Confirmed')),
    serviceComplete: row => this.mutate(this.api.updateService(row['id'], 'COMPLETED', 'Completed')),
    serviceRate: row => this.openNumberDialog('Rate service', 'Give a score between 1 and 5.', 'Rating', 'Submit rating', rating => this.api.rateService(row['id'], rating, 'Rated from app')),
    amenityBook: row => this.mutate(this.api.bookAmenity(row['slotId'], false)),
    amenityOpenInvite: row => this.mutate(this.api.bookAmenity(row['slotId'], true)),
    amenityJoin: row => this.mutate(this.api.joinAmenityInvite(row['slotId'])),
    amenityCancel: row => this.mutate(this.api.cancelAmenity(row['bookingId'])),
    subletApprove: row => this.mutate(this.api.approveSublet(row['id'])),
    subletComplete: row => this.openTextDialog('Complete sublet', 'Add the guest name to finish the check-in.', 'Guest name', 'Complete', guestName => this.api.completeSublet(row['id'], { guestName, guestPhone: '9000000000', checkInDate: new Date().toISOString().slice(0, 10) }))
  };

  moduleKey = computed(() => this.route.snapshot.data['module'] as ModuleKey);
  configMap = computed(() => buildModuleConfig(this.auth.role(), this.pgs().map(pg => String(pg.id)), option => this.pgName(option)));
  config = computed(() => this.configMap()[this.moduleKey()]);
  visibleFields = computed(() => (this.config().fields || []).filter(field => !field.show || field.show(this.auth.role())));
  filteredRows = computed(() => {
    const q = this.query.toLowerCase().trim();
    if (!q) return this.rows();
    return this.rows().filter(row => JSON.stringify(row).toLowerCase().includes(q));
  });
  filteredTransactions = computed(() => {
    const q = this.query.toLowerCase().trim();
    if (!q) return this.paymentTransactions();
    return this.paymentTransactions().filter(row => JSON.stringify(row).toLowerCase().includes(q));
  });
  canCreate = computed(() => !!this.config().fields?.length && !!this.config().createLabel);
  actionsMap = computed(() => buildModuleActions(this.auth.role(), this.actionHandlers));
  actions = computed<ActionConfig[]>(() => this.actionsMap()[this.moduleKey()]);
  tenantMenuPgId = computed(() => {
    if (this.auth.role() !== 'TENANT') return 0;
    const fromProfile = Number(this.tenantProfile()?.pgId || 0);
    if (fromProfile > 0) return fromProfile;
    const fromRows = this.rows().find(row => Number(row['pgId']) > 0);
    return Number(fromRows?.['pgId'] || 0);
  });
  weeklyTenantMenu = computed(() => {
    const order: Record<string, number> = { BREAKFAST: 0, LUNCH: 1, DINNER: 2 };
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()).toUpperCase();
    const menuRows = (this.rows() as MenuItem[]).filter(row => !!row.dayOfWeek && !!row.mealType);

    return days
      .map(day => ({
        day,
        isToday: day === today,
        weekLabel: menuRows.find(item => item.dayOfWeek === day)?.weekLabel || this.form['weekLabel'] || this.weekLabel(),
        meals: menuRows
          .filter(item => item.dayOfWeek === day)
          .sort((a, b) => (order[a.mealType] ?? 9) - (order[b.mealType] ?? 9))
      }))
      .filter(day => day.meals.length > 0);
  });

  constructor() {
    if (this.auth.role() === 'TENANT') {
      this.api.tenantProfile().subscribe({
        next: profile => {
          this.tenantProfile.set(profile);
          if (this.moduleKey() === 'menu') this.load();
        },
        error: () => undefined
      });
    }
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
    if (key === 'payments') {
      this.api.paymentOverview().subscribe({
        next: overview => {
          this.rows.set(overview.records.map(record => ({ ...record, walletAvailable: overview.summary.walletBalance || 0 })));
          this.paymentSummary.set(overview.summary);
          this.paymentTransactions.set(overview.transactions);
          this.loading.set(false);
          this.walletBalance.set(overview.summary.walletBalance || 0);
        },
        error: (err: { message?: string }) => {
          this.error.set(err?.message || 'Could not load data');
          this.loading.set(false);
        }
      });
      return;
    }
    const request: Observable<unknown> = key === 'complaints' ? this.api.listComplaints()
      : key === 'notices' ? this.api.listNotices()
      : key === 'vacate' ? this.api.listVacates()
      : key === 'services' ? this.api.listServices()
      : key === 'amenities' ? this.api.listAmenities()
      : key === 'sublets' ? this.api.listSublets()
      : this.api.listMenu(this.menuPgId(), this.form['weekLabel'] || this.weekLabel());
    request.subscribe({
      next: rows => {
        this.rows.set(Array.isArray(rows) ? rows as Row[] : []);
        this.paymentSummary.set(null);
        this.paymentTransactions.set([]);
        this.loading.set(false);
        if (key === 'sublets' && this.auth.role() === 'TENANT') this.loadWallet();
        if (key === 'notices' && this.auth.role() === 'TENANT') this.autoMarkTenantNotices(this.rows());
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
    return formatRowValue(row, col, value => this.pgName(value));
  }

  rowKey(row: Row): string {
    return String(row['id'] ?? row['bookingId'] ?? row['slotId'] ?? JSON.stringify(row));
  }

  label(col: string): string {
    return labelForColumn(col);
  }

  moneyColumn(col: string): boolean {
    return isMoneyColumn(col);
  }

  statusColumn(col: string): boolean { return isStatusColumn(col); }
  pillClass(status: unknown): string { return pillClassForStatus(status); }

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
      pgId: this.auth.role() === 'TENANT' ? this.tenantProfile()?.pgId : this.pgs()[0]?.id
    };
  }

  private menuPayload(): MenuItem[] {
    return [{
      pgId: this.menuPgId(),
      weekLabel: this.form['weekLabel'] || this.weekLabel(),
      dayOfWeek: this.form['dayOfWeek'],
      mealType: this.form['mealType'],
      itemNames: this.form['itemNames'],
      isVeg: !!this.form['isVeg']
    }];
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

  private loadWallet() {
    this.api.wallet().subscribe({ next: wallet => this.walletBalance.set(wallet.creditWalletBalance || 0), error: () => undefined });
  }

  private pgName(value: string): string {
    const id = Number(value);
    return this.pgs().find(pg => pg.id === id)?.name || `PG ${value}`;
  }

  private menuPgId(): number {
    if (this.auth.role() === 'TENANT') {
      return this.tenantMenuPgId();
    }
    return this.numberField('pgId') || this.pgs()[0]?.id || 0;
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

  private openNumberDialog(title: string, subtitle: string, label: string, confirmLabel: string, factory: (value: number) => { subscribe: (handlers: { next: () => void; error: (err: any) => void }) => void }, initialValue?: number) {
    this.numberActionFactory = factory;
    this.textActionFactory = null;
    this.actionDialogEyebrow.set(this.config().title);
    this.actionDialogTitle.set(title);
    this.actionDialogSubtitle.set(subtitle);
    this.actionDialogLabel.set(label);
    this.actionDialogConfirmLabel.set(confirmLabel);
    this.actionDialogType.set('number');
    this.actionDialogValue = initialValue && initialValue > 0 ? String(initialValue) : '';
    this.actionDialogOpen.set(true);
  }

  closeActionDialog() {
    this.actionDialogOpen.set(false);
    this.textActionFactory = null;
    this.numberActionFactory = null;
    this.actionDialogValue = '';
  }

  submitActionDialog() {
    const raw = String(this.actionDialogValue ?? '').trim();
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

  private autoMarkTenantNotices(rows: Row[]) {
    const unreadIds = rows.filter(row => !row['read']).map(row => Number(row['id'])).filter(id => id > 0);
    if (!unreadIds.length) return;
    this.rows.set(rows.map(row => row['read'] ? row : { ...row, read: true }));
    unreadIds.forEach(id => {
      this.api.markNoticeRead(id).subscribe({ error: () => undefined });
    });
  }

  paymentSummaryCards() {
    return buildPaymentSummaryCards(this.paymentSummary(), this.auth.role());
  }

  transactionColumns(): string[] {
    return transactionColumns(this.auth.role());
  }

  transactionValue(tx: PaymentTransaction, col: string): string {
    return formatTransactionValue(tx, col, this.rows());
  }

  private money(value: number): string {
    return `₹${value.toLocaleString('en-IN')}`;
  }
}
