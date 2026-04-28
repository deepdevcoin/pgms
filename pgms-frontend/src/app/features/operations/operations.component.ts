import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AmenityBooking, ComplaintActivity, MenuItem, NoticeReadReceipt, PaymentSummary, PaymentTransaction, PG, Role, Tenant, WalletInfo } from '../../core/models';
import { MenuBoardComponent } from '../../shared/menu-board.component';
import { PopupShellComponent } from '../../shared/popup-shell.component';
import { DateInputComponent } from '../../shared/date-input.component';
import { DisplayDatePipe } from '../../shared/display-date.pipe';
import { AmenitySlotBoardComponent } from './amenity-slot-board.component';
import { buildModuleActions, buildModuleConfig, OperationsActionHandlers } from './operations.config';
import { buildPaymentSummaryCards, formatRowValue, formatTransactionValue, isMoneyColumn, isStatusColumn, labelForColumn, pillClassForStatus, transactionColumns } from './operations.formatters';
import { OperationsFormComponent } from './operations-form.component';
import { OperationsHeaderComponent } from './operations-header.component';
import { MenuWeekPlannerComponent } from './menu-week-planner.component';
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
    DateInputComponent,
    DisplayDatePipe,
    MenuBoardComponent,
    AmenitySlotBoardComponent,
    OperationsHeaderComponent,
    MenuWeekPlannerComponent,
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
          @if (walletInfo()?.credits?.length && moduleKey() === 'sublets') {
            <div class="wallet-breakdown">
              @for (entry of walletInfo()!.credits; track entry.subletRequestId + '-' + (entry.creditedAt || '')) {
                <div class="wallet-entry">
                  <strong>₹{{ entry.creditedAmount | number:'1.0-0' }}</strong>
                  <span>
                    {{ entry.occupiedDays || 0 }} day{{ (entry.occupiedDays || 0) === 1 ? '' : 's' }}
                    · {{ entry.checkInDate | displayDate }} to {{ entry.checkOutDate | displayDate }}
                  </span>
                </div>
              }
            </div>
          }
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
        [showLoadWeek]="false"
        (submitForm)="submit()"
        (loadWeek)="loadMenu()"
      />
    }

    @if (isMenuPlannerMode()) {
      <app-menu-planner
        [pgs]="pgs()"
        [pgId]="menuPgId()"
        [items]="menuItems()"
        [saving]="saving()"
        (pgIdChange)="setMenuPgId($event)"
        (loadWeek)="loadMenu()"
        (saveWeek)="saveMenuPlanner($event)"
      />
    } @else {
      @if (moduleKey() === 'menu') {
        <div class="toolbar">
          @if (auth.role() !== 'TENANT') {
            <label class="menu-select">
              <span>PG</span>
              <select [ngModel]="menuPgId()" (ngModelChange)="setMenuPgId($event); loadMenu()">
                @for (pg of pgs(); track pg.id) {
                  <option [ngValue]="pg.id">{{ pg.name }}</option>
                }
              </select>
            </label>
          }
          <button class="btn btn--ghost" (click)="loadMenu()"><mat-icon>refresh</mat-icon><span>Refresh</span></button>
        </div>
      } @else {
      <div class="toolbar">
        <div class="search">
          <mat-icon>search</mat-icon>
          <input [(ngModel)]="query" name="query" placeholder="Search" />
        </div>
        <button class="btn btn--ghost" (click)="load()"><mat-icon>refresh</mat-icon><span>Refresh</span></button>
      </div>
      }

      @if (loading()) {
        <div class="state card"><div class="spinner"></div><span>Loading {{ config().title.toLowerCase() }}...</span></div>
      } @else if (error()) {
        <div class="state card err"><mat-icon>error</mat-icon><span>{{ error() }}</span></div>
      } @else if (moduleKey() === 'menu') {
        <app-menu-board
          [items]="tenantMenuItems()"
          mode="week"
          [showWeekLabel]="false"
          emptyLabel="Menu is not available for this PG yet."
        />
      } @else if (moduleKey() === 'amenities' && auth.role() === 'TENANT') {
        <app-amenity-slot-board
          [rows]="tenantAmenityRows()"
          emptyLabel="No amenity slots available right now."
          [book]="runAmenityBook.bind(this)"
          [openInvite]="runAmenityOpenInvite.bind(this)"
          [joinInvite]="runAmenityJoin.bind(this)"
          [cancel]="runAmenityCancel.bind(this)"
        />
      } @else if (filteredRows().length === 0) {
        <div class="state card"><mat-icon>inbox</mat-icon><span>No records found.</span></div>
      } @else {
        <app-operations-table
          [columns]="config().columns"
          [rows]="filteredRows()"
          [actions]="actions()"
          [role]="auth.role()"
          [moduleKey]="moduleKey()"
          [compact]="compactTable()"
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
            <div class="receipt-time">{{ receipt.readAt | displayDate:'datetime' }}</div>
          </div>
        }
      </div>
    }
  </app-popup-shell>

  <app-popup-shell
    [open]="complaintTimelineOpen()"
    eyebrow="Complaints"
    [title]="selectedComplaintTitle() || 'Complaint history'"
    [subtitle]="complaintTimelineSummary()"
    (closed)="closeComplaintTimeline()"
  >
    @if (complaintTimelineLoading()) {
      <div class="state"><div class="spinner"></div><span>Loading complaint history...</span></div>
    } @else if (complaintActivities().length === 0) {
      <div class="state"><mat-icon>forum</mat-icon><span>No activity recorded yet.</span></div>
    } @else {
      <div class="receipt-list">
        @for (activity of complaintActivities(); track activity.id + '-' + activity.createdAt) {
          <div class="receipt-row receipt-row--stacked">
            <div class="receipt-topline">
              <div>
                <div class="receipt-name">{{ complaintActivityTitle(activity) }}</div>
                <div class="receipt-meta">{{ activity.actorName || activity.actorRole || 'System' }}</div>
              </div>
              <div class="receipt-time">{{ activity.createdAt | displayDate:'datetime' }}</div>
            </div>
            @if (activity.message) {
              <div class="receipt-message">{{ activity.message }}</div>
            }
          </div>
        }
      </div>
    }
  </app-popup-shell>

  <app-popup-shell
    [open]="subletCheckInOpen()"
    eyebrow="Sublets"
    title="Check in guest"
    subtitle="Create a temporary guest record for this approved sublet."
    (closed)="closeSubletCheckIn()"
  >
    <div class="dialog-grid">
      <label class="fld">
        <span>Guest name</span>
        <input [(ngModel)]="subletGuestForm.guestName" name="subletGuestName" />
      </label>
      <label class="fld">
        <span>Guest phone</span>
        <input [(ngModel)]="subletGuestForm.guestPhone" name="subletGuestPhone" />
      </label>
      <label class="fld">
        <span>Check in date</span>
        <app-date-input [(value)]="subletGuestForm.checkInDate"></app-date-input>
      </label>
    </div>
    <div class="dialog-actions">
      <button class="btn btn--ghost" type="button" (click)="closeSubletCheckIn()">Cancel</button>
      <button class="btn btn--primary" type="button" (click)="submitSubletCheckIn()">
        <mat-icon>check</mat-icon>
        <span>Create guest record</span>
      </button>
    </div>
  </app-popup-shell>

  <app-popup-shell
    [open]="confirmDialogOpen()"
    [eyebrow]="confirmDialogEyebrow()"
    [title]="confirmDialogTitle()"
    [subtitle]="confirmDialogSubtitle()"
    (closed)="closeConfirmDialog()"
  >
    <div class="dialog-actions">
      <button class="btn btn--ghost" type="button" (click)="closeConfirmDialog()">Cancel</button>
      <button class="btn btn--primary" type="button" (click)="confirmDialogProceed()">
        <mat-icon>check</mat-icon>
        <span>{{ confirmDialogConfirmLabel() }}</span>
      </button>
    </div>
  </app-popup-shell>
  `,
  styles: [`
    .ops { display: flex; flex-direction: column; gap: 18px; }
    .wallet { display: flex; align-items: center; gap: 14px; padding: 16px; width: fit-content; }
    .wallet mat-icon { color: var(--primary); }
    .wallet-label { color: var(--text-muted); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; }
    .wallet-value { font-size: 26px; font-weight: 800; font-family: var(--font-mono); }
    .wallet-meta { margin-top: 4px; color: var(--text-muted); font-size: 12px; line-height: 1.45; max-width: 320px; }
    .wallet-breakdown { margin-top: 12px; display: grid; gap: 8px; }
    .wallet-entry { display: grid; gap: 2px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); }
    .wallet-entry strong { font-size: 13px; }
    .wallet-entry span { color: var(--text-muted); font-size: 12px; }
    .toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; }
    .menu-select { display: grid; gap: 6px; min-width: 220px; }
    .menu-select span { color: var(--text-muted); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
    .menu-select select { background: var(--surface); border: 1px solid var(--border); color: var(--text); border-radius: 12px; padding: 11px 12px; }
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
    .dialog-grid { display: grid; gap: 12px; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 10px; }
    .receipt-list { display: flex; flex-direction: column; gap: 10px; }
    .receipt-row { display: flex; justify-content: space-between; gap: 14px; align-items: center; padding: 12px 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); }
    .receipt-row--stacked { display: grid; gap: 8px; }
    .receipt-topline { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; }
    .receipt-name { font-weight: 600; }
    .receipt-meta, .receipt-time { color: var(--text-muted); font-size: 12px; }
    .receipt-time { text-align: right; }
    .receipt-message { color: var(--text); font-size: 13px; line-height: 1.5; white-space: pre-line; }
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
  walletInfo = signal<WalletInfo | null>(null);
  paymentSummary = signal<PaymentSummary | null>(null);
  paymentTransactions = signal<PaymentTransaction[]>([]);
  confirmDialogOpen = signal(false);
  confirmDialogEyebrow = signal('');
  confirmDialogTitle = signal('');
  confirmDialogSubtitle = signal('');
  confirmDialogConfirmLabel = signal('Confirm');
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
  complaintTimelineOpen = signal(false);
  complaintTimelineLoading = signal(false);
  selectedComplaintTitle = signal('');
  complaintActivities = signal<ComplaintActivity[]>([]);
  query = '';
  form: Row = {};
  actionDialogValue: string | number = '';
  subletCheckInOpen = signal(false);
  subletCheckInRow = signal<Row | null>(null);
  subletGuestForm = { guestName: '', guestPhone: '', checkInDate: '' };
  private confirmAction: (() => void) | null = null;
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
    complaintInProgress: row => this.mutate(this.api.updateComplaint(row['id'], 'IN_PROGRESS')),
    complaintEscalate: row => this.openTextDialog('Escalate complaint', 'Add a short escalation note for the owner.', 'Escalation note', 'Escalate', notes => this.api.updateComplaint(row['id'], 'ESCALATED', notes)),
    complaintResolve: row => this.openTextDialog('Resolve complaint', 'Share the resolution details for the tenant.', 'Resolution notes', 'Resolve', notes => this.api.updateComplaint(row['id'], 'RESOLVED', notes)),
    complaintClose: row => this.openTextDialog('Close complaint', 'Add a closing note before marking this issue complete.', 'Closing note', 'Close complaint', notes => this.api.updateComplaint(row['id'], 'CLOSED', notes)),
    complaintComment: row => this.openTextDialog(
      this.auth.role() === 'TENANT' ? 'Add follow-up' : 'Add complaint note',
      this.auth.role() === 'TENANT' ? 'Add more context to this complaint.' : 'Add a timeline note without changing the complaint status.',
      this.auth.role() === 'TENANT' ? 'Follow-up' : 'Note',
      this.auth.role() === 'TENANT' ? 'Post follow-up' : 'Add note',
      notes => this.api.commentOnComplaint(row['id'], notes)
    ),
    complaintTimeline: row => this.showComplaintTimeline(row),
    noticeMarkRead: row => this.mutate(this.api.markNoticeRead(row['id'])),
    noticeReceipts: row => this.showReceipts(row['id'], row['title']),
    vacateApprove: row => this.mutate(this.api.approveVacateReferral(row['id'], true)),
    vacateReject: row => this.openTextDialog('Reject vacate notice', 'Share a short message so the tenant knows what needs to change.', 'Manager message', 'Reject notice', message => this.api.rejectVacate(row['id'], message)),
    vacateCheckout: row => this.mutate(this.api.checkoutVacate(row['id'])),
    serviceConfirm: row => this.mutate(this.api.updateService(row['id'], 'CONFIRMED')),
    serviceStart: row => this.mutate(this.api.updateService(row['id'], 'IN_PROGRESS')),
    serviceComplete: row => this.mutate(this.api.updateService(row['id'], 'COMPLETED')),
    serviceReject: row => this.mutate(this.api.updateService(row['id'], 'REJECTED')),
    serviceRate: row => this.openNumberDialog('Rate service', 'Give a score between 1 and 5 for the completed service.', 'Rating', 'Submit rating', rating => this.api.rateService(row['id'], rating)),
    amenityBook: row => this.mutate(this.api.bookAmenity(row['slotId'], false)),
    amenityOpenInvite: row => this.mutate(this.api.bookAmenity(row['slotId'], true)),
    amenityJoin: row => this.mutate(this.api.joinAmenityInvite(row['slotId'])),
    amenityCancel: row => this.mutate(this.api.cancelAmenity(row['bookingId'])),
    amenityDeleteSlot: row => this.mutate(this.api.deleteAmenitySlot(row['slotId'])),
    subletApprove: row => this.mutate(this.api.approveSublet(row['id'])),
    subletReject: row => this.openConfirmDialog(
      'Sublets',
      'Disapprove this sublet request?',
      'The tenant will be able to submit a fresh request later.',
      'Disapprove',
      () => this.mutate(this.api.rejectSublet(row['id']))
    ),
    subletCheckIn: row => this.openConfirmDialog(
      'Sublets',
      'Start guest check in?',
      'You can add the guest details in the next step.',
      'Continue',
      () => this.openSubletCheckIn(row)
    ),
    subletCheckout: row => this.openConfirmDialog(
      'Sublets',
      'Checkout this guest?',
      'This will complete the active sublet stay and release the guest record.',
      'Checkout',
      () => this.mutate(this.api.checkoutSublet(row['id']))
    )
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
  canCreate = computed(() => {
    if (this.isMenuPlannerMode()) return false;
    if (!this.config().fields?.length || !this.config().createLabel) return false;
    if (this.moduleKey() === 'vacate' && this.auth.role() === 'TENANT') {
      const current = this.rows()[0];
      return !current || current['status'] === 'REJECTED';
    }
    return true;
  });
  actionsMap = computed(() => buildModuleActions(this.auth.role(), this.actionHandlers));
  actions = computed<ActionConfig[]>(() => this.actionsMap()[this.moduleKey()]);
  tenantMenuPgId = computed(() => {
    if (this.auth.role() !== 'TENANT') return 0;
    const fromProfile = Number(this.tenantProfile()?.pgId || 0);
    if (fromProfile > 0) return fromProfile;
    const fromRows = this.rows().find(row => Number(row['pgId']) > 0);
    return Number(fromRows?.['pgId'] || 0);
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
    if (key === 'menu' && !this.menuPgId()) {
      this.rows.set([]);
      this.loading.set(false);
      return;
    }
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
      : this.api.listMenu(this.menuPgId());
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

  saveMenuPlanner(items: MenuItem[]) {
    if (!this.menuPgId()) {
      this.snack.open('Select a PG before saving the menu.', 'Dismiss', { duration: 2400, panelClass: 'pgms-snack' });
      return;
    }
    if (!items.length) {
      this.snack.open('Add at least one meal before saving the menu.', 'Dismiss', { duration: 2400, panelClass: 'pgms-snack' });
      return;
    }
    this.saving.set(true);
    this.api.saveMenu(items).subscribe({
      next: rows => {
        this.saving.set(false);
        this.rows.set(rows as Row[]);
        this.snack.open('Menu updated', 'OK', { duration: 2000, panelClass: 'pgms-snack' });
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.snack.open(err?.message || 'Save failed', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' });
      }
    });
  }

  submit() {
    const validationError = this.validateBeforeSubmit();
    if (validationError) {
      this.snack.open(validationError, 'Dismiss', { duration: 2600, panelClass: 'pgms-snack' });
      return;
    }
    this.openConfirmDialog(
      this.config().title,
      this.submitTitle(),
      this.submitSubtitle(),
      'Submit',
      () => this.executeSubmit()
    );
  }

  private executeSubmit() {
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
	              ? this.api.createService({ serviceType: this.form['serviceType'], preferredDate: this.form['preferredDate'], preferredTimeWindow: this.form['preferredTimeWindow'], requestNotes: this.form['requestNotes'] })
	              : key === 'amenities' && this.auth.role() === 'MANAGER'
	                ? this.api.createAmenitySlot({ pgId: this.numberField('pgId'), amenityType: this.form['amenityType'], slotDate: this.form['slotDate'], startTime: this.form['startTime'], endTime: this.form['endTime'], capacity: this.numberField('capacity'), generationDays: Number(this.form['generationDays'] || 2), facilityName: this.form['facilityName'] })
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
      serviceType: 'CLEANING',
      preferredTimeWindow: '6:00 PM - 8:00 PM',
      amenityType: 'WASHING_MACHINE',
      capacity: 1,
      dayOfWeek: 'MONDAY',
      mealType: 'BREAKFAST',
      isVeg: true,
      pgId: this.auth.role() === 'TENANT' ? this.tenantProfile()?.pgId : this.pgs()[0]?.id
    };
  }

  private menuPayload(): MenuItem[] {
    return [{
      pgId: this.menuPgId(),
      dayOfWeek: this.form['dayOfWeek'],
      mealType: this.form['mealType'],
      itemNames: this.form['itemNames'],
      isVeg: !!this.form['isVeg']
    }];
  }

  private loadWallet() {
    this.api.wallet().subscribe({
      next: wallet => {
        this.walletInfo.set(wallet);
        this.walletBalance.set(wallet.creditWalletBalance || 0);
      },
      error: () => undefined
    });
  }

  private pgName(value: string): string {
    const id = Number(value);
    return this.pgs().find(pg => pg.id === id)?.name || `PG ${value}`;
  }

  menuPgId(): number {
    if (this.auth.role() === 'TENANT') {
      return this.tenantMenuPgId();
    }
    return this.numberField('pgId') || this.pgs()[0]?.id || 0;
  }

  currentMenuWeekLabel(): string {
    return 'CURRENT';
  }

  setMenuPgId(pgId: number) {
    this.form['pgId'] = Number(pgId || 0);
  }

  setMenuWeekLabel(weekLabel: string) {
    this.form['weekLabel'] = weekLabel;
  }

  isMenuPlannerMode(): boolean {
    return this.moduleKey() === 'menu' && this.auth.role() === 'MANAGER';
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

  private openSubletCheckIn(row: Row) {
    this.subletCheckInRow.set(row);
    this.subletGuestForm = {
      guestName: '',
      guestPhone: '',
      checkInDate: String(row['startDate'] || new Date().toISOString().slice(0, 10))
    };
    this.subletCheckInOpen.set(true);
  }

  closeSubletCheckIn() {
    this.subletCheckInOpen.set(false);
    this.subletCheckInRow.set(null);
    this.subletGuestForm = { guestName: '', guestPhone: '', checkInDate: '' };
  }

  openConfirmDialog(eyebrow: string, title: string, subtitle: string, confirmLabel: string, action: () => void) {
    this.confirmAction = action;
    this.confirmDialogEyebrow.set(eyebrow);
    this.confirmDialogTitle.set(title);
    this.confirmDialogSubtitle.set(subtitle);
    this.confirmDialogConfirmLabel.set(confirmLabel);
    this.confirmDialogOpen.set(true);
  }

  closeConfirmDialog() {
    this.confirmDialogOpen.set(false);
    this.confirmAction = null;
  }

  confirmDialogProceed() {
    const action = this.confirmAction;
    this.closeConfirmDialog();
    action?.();
  }

  submitSubletCheckIn() {
    const row = this.subletCheckInRow();
    const guestName = this.subletGuestForm.guestName.trim();
    const guestPhone = this.subletGuestForm.guestPhone.trim();
    const checkInDate = this.subletGuestForm.checkInDate;
    if (!row || !guestName || !guestPhone || !checkInDate) {
      this.snack.open('Enter guest name, phone, and check in date.', 'Dismiss', { duration: 2400, panelClass: 'pgms-snack' });
      return;
    }
    if (!/^\d{10}$/.test(guestPhone)) {
      this.snack.open('Guest phone must be exactly 10 digits.', 'Dismiss', { duration: 2400, panelClass: 'pgms-snack' });
      return;
    }
    const request = this.api.checkInSublet(row['id'], { guestName, guestPhone, checkInDate });
    this.closeSubletCheckIn();
    this.mutate(request);
  }

  private validateBeforeSubmit(): string | null {
    const key = this.moduleKey();
    if (key === 'vacate') {
      const date = String(this.form['intendedVacateDate'] || '');
      if (!date) return 'Choose an intended vacate date.';
      if (date < this.todayIso()) return 'Vacate date cannot be in the past.';
      if (this.form['hasReferral']) {
        if (!String(this.form['referralName'] || '').trim()) return 'Enter the referral name.';
        if (!/^\d{10}$/.test(String(this.form['referralPhone'] || '').trim())) return 'Referral phone must be exactly 10 digits.';
        if (!this.isEmail(String(this.form['referralEmail'] || '').trim())) return 'Enter a valid referral email.';
      }
    }
    if (key === 'services') {
      const date = String(this.form['preferredDate'] || '');
      if (!date) return 'Choose a preferred service date.';
      if (date < this.todayIso()) return 'Preferred service date cannot be in the past.';
    }
    if (key === 'sublets') {
      const startDate = String(this.form['startDate'] || '');
      const endDate = String(this.form['endDate'] || '');
      if (!startDate || !endDate) return 'Choose both sublet start and end dates.';
      if (startDate < this.todayIso()) return 'Sublet start date cannot be in the past.';
      if (endDate <= startDate) return 'Sublet end date must be after the start date.';
      if (!String(this.form['reason'] || '').trim()) return 'Add a reason for the sublet request.';
    }
    return null;
  }

  private submitTitle(): string {
    return this.moduleKey() === 'vacate'
      ? 'Submit vacate request?'
      : this.moduleKey() === 'sublets'
        ? 'Submit sublet request?'
        : this.moduleKey() === 'services'
          ? 'Book this service request?'
          : this.moduleKey() === 'complaints'
            ? 'Raise this complaint?'
            : this.moduleKey() === 'notices'
              ? 'Publish this notice?'
              : 'Submit this request?';
  }

  private submitSubtitle(): string {
    return this.moduleKey() === 'vacate'
      ? 'We will send this notice to the manager for review.'
      : this.moduleKey() === 'sublets'
        ? 'The manager will review the dates before a guest can check in.'
        : this.moduleKey() === 'services'
          ? 'This service booking will go into the manager dispatch queue.'
          : this.moduleKey() === 'complaints'
            ? 'This complaint will be recorded in your request history.'
            : this.moduleKey() === 'notices'
              ? 'The selected audience will see this notice once it is published.'
              : 'Please confirm before continuing.';
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private isEmail(value: string): boolean {
    return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

  closeComplaintTimeline() {
    this.complaintTimelineOpen.set(false);
    this.complaintTimelineLoading.set(false);
    this.complaintActivities.set([]);
    this.selectedComplaintTitle.set('');
  }

  receiptSummary(): string {
    if (this.receiptsLoading()) return 'Checking who has opened this notice.';
    const count = this.receipts().length;
    return count ? `${count} receipt${count === 1 ? '' : 's'} captured.` : 'No one has marked this notice as read yet.';
  }

  complaintTimelineSummary(): string {
    if (this.complaintTimelineLoading()) return 'Checking the complaint history.';
    const count = this.complaintActivities().length;
    return count ? `${count} timeline entr${count === 1 ? 'y' : 'ies'} recorded.` : 'No updates recorded yet.';
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

  private showComplaintTimeline(row: Row) {
    this.complaintTimelineOpen.set(true);
    this.complaintTimelineLoading.set(true);
    this.selectedComplaintTitle.set(`${row['tenantName'] || 'Complaint'} · ${row['category'] || 'Issue'}`);
    this.complaintActivities.set([]);
    this.api.listComplaintActivities(Number(row['id'])).subscribe({
      next: activities => {
        this.complaintActivities.set(activities);
        this.complaintTimelineLoading.set(false);
      },
      error: err => {
        this.complaintTimelineLoading.set(false);
        this.snack.open(err?.message || 'Could not load complaint history', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' });
      }
    });
  }

  complaintActivityTitle(activity: ComplaintActivity): string {
    if (activity.activityType === 'STATUS_CHANGE') {
      const fromStatus = activity.fromStatus ? this.prettyEnum(activity.fromStatus) : 'Unknown';
      const toStatus = activity.toStatus ? this.prettyEnum(activity.toStatus) : 'Unknown';
      return `${fromStatus} -> ${toStatus}`;
    }
    if (activity.activityType === 'CREATED') return 'Complaint created';
    return 'Comment added';
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

  private prettyEnum(value: string): string {
    return value.toLowerCase().split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  private money(value: number): string {
    return `₹${value.toLocaleString('en-IN')}`;
  }

  tenantMenuItems(): MenuItem[] {
    return (this.rows() as MenuItem[]).filter(row => !!row.dayOfWeek && !!row.mealType);
  }

  menuItems(): MenuItem[] {
    return this.rows() as MenuItem[];
  }

  tenantAmenityRows(): AmenityBooking[] {
    return this.filteredRows() as AmenityBooking[];
  }

  compactTable(): boolean {
    return ['payments', 'complaints', 'services', 'vacate', 'sublets'].includes(this.moduleKey());
  }

  runAmenityBook(row: Row) {
    this.actionHandlers.amenityBook(row);
  }

  runAmenityOpenInvite(row: Row) {
    this.actionHandlers.amenityOpenInvite(row);
  }

  runAmenityJoin(row: Row) {
    this.actionHandlers.amenityJoin(row);
  }

  runAmenityCancel(row: Row) {
    this.actionHandlers.amenityCancel(row);
  }
}
