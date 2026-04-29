import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
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
import { ActionConfig, FieldConfig, ModuleKey, Row } from './operations.types';

type NoticeFilter = 'ALL' | 'SCHEDULED' | 'SENT';

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
      @if (moduleKey() === 'notices') {
        <div class="notice-filter-bar">
          @for (filter of noticeFilters; track filter) {
            <button
              class="notice-filter"
              type="button"
              [class.notice-filter--active]="noticeFilter() === filter"
              (click)="noticeFilter.set(filter)"
            >
              <span>{{ noticeFilterLabel(filter) }}</span>
              <strong>{{ noticeFilterCount(filter) }}</strong>
            </button>
          }
        </div>
      }
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
      } @else if (moduleKey() === 'notices' && auth.role() !== 'TENANT') {
        <div class="notice-sections">
          <section class="notice-section">
            <div class="notice-section-head">
              <h2>My notices</h2>
              <span>{{ managerCreatedNoticeRows().length }} notice{{ managerCreatedNoticeRows().length === 1 ? '' : 's' }}</span>
            </div>
            @if (managerCreatedNoticeRows().length === 0) {
              <div class="state card state--compact"><mat-icon>campaign</mat-icon><span>No notices created by you.</span></div>
            } @else {
              <app-operations-table
                [columns]="managerCreatedNoticeColumns()"
                [rows]="managerCreatedNoticeRows()"
                [actions]="actions()"
                [role]="auth.role()"
                [moduleKey]="moduleKey()"
                [showActions]="true"
                [clickableRows]="noticeRowsClickable()"
                [label]="label.bind(this)"
                [value]="value.bind(this)"
                [rowKey]="rowKey.bind(this)"
                [moneyColumn]="moneyColumn.bind(this)"
                [statusColumn]="statusColumn.bind(this)"
                [pillClass]="pillClass.bind(this)"
                [cellClass]="cellClass.bind(this)"
                (rowClick)="handleRowClick($event)"
              />
            }
          </section>

          <section class="notice-section">
            <div class="notice-section-head">
              <h2>Other notices</h2>
              <span>{{ managerReceivedNoticeRows().length }} notice{{ managerReceivedNoticeRows().length === 1 ? '' : 's' }}</span>
            </div>
            @if (managerReceivedNoticeRows().length === 0) {
              <div class="state card state--compact"><mat-icon>inbox</mat-icon><span>No other notices.</span></div>
            } @else {
              <app-operations-table
                [columns]="managerReceivedNoticeColumns()"
                [rows]="managerReceivedNoticeRows()"
                [actions]="actions()"
                [role]="auth.role()"
                [moduleKey]="moduleKey()"
                [showActions]="false"
                [clickableRows]="noticeRowsClickable()"
                [label]="label.bind(this)"
                [value]="value.bind(this)"
                [rowKey]="rowKey.bind(this)"
                [moneyColumn]="moneyColumn.bind(this)"
                [statusColumn]="statusColumn.bind(this)"
                [pillClass]="pillClass.bind(this)"
                [cellClass]="cellClass.bind(this)"
                (rowClick)="handleRowClick($event)"
              />
            }
          </section>
        </div>
      } @else {
        <app-operations-table
          [columns]="config().columns"
          [rows]="filteredRows()"
          [actions]="actions()"
          [role]="auth.role()"
          [moduleKey]="moduleKey()"
          [showActions]="showActionColumn()"
          [clickableRows]="noticeRowsClickable()"
          [compact]="compactTable()"
          [minWidth]="moduleKey() === 'payments' ? '100%' : ''"
          [label]="label.bind(this)"
          [value]="value.bind(this)"
          [rowKey]="rowKey.bind(this)"
          [moneyColumn]="moneyColumn.bind(this)"
          [statusColumn]="statusColumn.bind(this)"
          [pillClass]="pillClass.bind(this)"
          [cellClass]="cellClass.bind(this)"
          (rowClick)="handleRowClick($event)"
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
      @if (actionDialogType() === 'rating') {
        <div class="rating-picker" role="radiogroup" aria-label="Service rating">
          @for (star of ratingOptions; track star) {
            <button
              class="rating-star"
              type="button"
              [class.rating-star--active]="selectedRating() >= star"
              [attr.aria-pressed]="selectedRating() === star"
              (click)="setRating(star)"
            >
              <mat-icon>{{ selectedRating() >= star ? 'star' : 'star_outline' }}</mat-icon>
            </button>
          }
        </div>
        <div class="rating-copy">{{ selectedRating() ? selectedRating() + ' of 5 selected' : 'Choose 1 to 5 stars' }}</div>
      } @else if (actionDialogType() === 'number') {
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
    [open]="noticePreviewOpen()"
    eyebrow="Notice"
    [title]="noticePreviewTitle()"
    [subtitle]="noticePreviewSubtitle()"
    (closed)="closeNoticePreview()"
  >
    <article class="notice-preview">
      @if (noticePreviewReadStatus()) {
        <span class="notice-preview-read" [class.notice-preview-read--unread]="noticePreviewReadStatus() === 'Unread'">
          {{ noticePreviewReadStatus() }}
        </span>
      }
      @if (noticePreviewTimer()) {
        <div class="notice-preview-timer">
          <mat-icon>{{ noticePreviewTimer() === 'Sent' ? 'check_circle' : 'schedule' }}</mat-icon>
          <span>{{ noticePreviewTimer() === 'Sent' ? 'Sent' : 'Sends in ' + noticePreviewTimer() }}</span>
        </div>
      }
      <p>{{ noticePreviewContent() }}</p>
    </article>
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
        <app-date-input
          [(value)]="subletGuestForm.checkInDate"
          [min]="subletCheckInMinDate()"
          [max]="subletCheckInMaxDate()"
        ></app-date-input>
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
    .state--compact { min-height: 104px; }
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
    .notice-preview {
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--bg);
      display: grid;
      gap: 12px;
    }
    .notice-preview-read {
      width: fit-content;
      padding: 7px 10px;
      border-radius: 999px;
      border: 1px solid rgba(34,197,94,0.38);
      background: rgba(34,197,94,0.14);
      color: #86efac;
      font-size: 12px;
      font-weight: 700;
    }
    .notice-preview-read--unread {
      border-color: rgba(251,191,36,0.42);
      background: rgba(251,191,36,0.14);
      color: #fde68a;
    }
    .notice-preview-timer {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: fit-content;
      padding: 7px 10px;
      border-radius: 999px;
      border: 1px solid rgba(96,165,250,0.38);
      background: rgba(96,165,250,0.12);
      color: #bfdbfe;
      font-size: 12px;
      font-weight: 700;
    }
    .notice-preview-timer mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .notice-preview p {
      margin: 0;
      color: var(--text);
      font-size: 14px;
      line-height: 1.7;
      white-space: pre-line;
    }
    .notice-sections { display: grid; gap: 18px; }
    .notice-section { display: grid; gap: 10px; }
    .notice-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 0 2px; }
    .notice-section-head h2 { margin: 0; font-size: 16px; line-height: 1.3; }
    .notice-section-head span { color: var(--text-muted); font-size: 12px; }
    .notice-filter-bar { display: flex; gap: 8px; flex-wrap: wrap; }
    .notice-filter {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 34px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-muted);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
    }
    .notice-filter strong {
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      display: inline-grid;
      place-items: center;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      color: var(--text);
      font-size: 11px;
      font-family: var(--font-mono);
    }
    .notice-filter--active {
      color: #bfdbfe;
      border-color: rgba(96,165,250,0.42);
      background: rgba(96,165,250,0.12);
    }
    .rating-picker { display: flex; gap: 6px; align-items: center; }
    .rating-star {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--bg-elev);
      color: var(--text-muted);
      display: grid;
      place-items: center;
      cursor: pointer;
    }
    .rating-star--active {
      color: #fbbf24;
      border-color: rgba(251,191,36,0.35);
      background: rgba(251,191,36,0.12);
    }
    .rating-copy { color: var(--text-muted); font-size: 12px; }
  `],
  host: {}
})
export class OperationsComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  auth = inject(AuthService);

  rows = signal<Row[]>([]);
  pgs = signal<PG[]>([]);
  tenants = signal<Tenant[]>([]);
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
  actionDialogType = signal<'text' | 'number' | 'rating'>('text');
  actionDialogConfirmLabel = signal('Save');
  noticePreviewOpen = signal(false);
  noticePreviewRow = signal<Row | null>(null);
  noticeFilter = signal<NoticeFilter>('ALL');
  nowMs = signal(Date.now());
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
  readonly ratingOptions = [1, 2, 3, 4, 5];
  readonly noticeFilters: NoticeFilter[] = ['ALL', 'SCHEDULED', 'SENT'];
  private readonly noticeTimer = window.setInterval(() => this.nowMs.set(Date.now()), 1000);
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
    noticeDelete: row => this.openConfirmDialog(
      'Notices',
      'Delete this notice?',
      'This will remove the notice and its read receipts for everyone.',
      'Delete notice',
      () => this.mutate(this.api.deleteNotice(row['id']))
    ),
    vacateApprove: row => this.mutate(this.api.approveVacateReferral(row['id'], true)),
    vacateReject: row => this.openTextDialog('Reject vacate notice', 'Share a short message so the tenant knows what needs to change.', 'Manager message', 'Reject notice', message => this.api.rejectVacate(row['id'], message)),
    vacateCheckout: row => this.mutate(this.api.checkoutVacate(row['id'])),
    serviceConfirm: row => this.mutate(this.api.updateService(row['id'], 'CONFIRMED')),
    serviceStart: row => this.mutate(this.api.updateService(row['id'], 'IN_PROGRESS')),
    serviceComplete: row => this.mutate(this.api.updateService(row['id'], 'COMPLETED')),
    serviceReject: row => this.mutate(this.api.updateService(row['id'], 'REJECTED')),
    serviceRate: row => this.openRatingDialog('Rate service', 'Choose a score from 1 to 5 stars for the completed service.', 'Rating', 'Submit rating', rating => this.api.rateService(row['id'], rating)),
    amenityBook: row => this.mutate(this.api.bookAmenity(row['slotId'], false)),
    amenityOpenInvite: row => this.mutate(this.api.bookAmenity(row['slotId'], true)),
    amenityJoin: row => this.mutate(this.api.joinAmenityInvite(row['slotId'])),
    amenityCancel: row => this.mutate(this.api.cancelAmenity(row['bookingId'])),
    amenityDeleteSlot: row => this.mutate(this.api.deleteAmenitySlot(row['slotId'])),
    subletApprove: row => this.mutate(this.api.approveSublet(row['id'])),
    subletUnapprove: row => this.openConfirmDialog(
      'Sublets',
      'Move this sublet back to pending?',
      'This will remove the current approval so the request can be reviewed again.',
      'Move to pending',
      () => this.mutate(this.api.unapproveSublet(row['id']))
    ),
    subletDelete: row => this.openConfirmDialog(
      'Sublets',
      'Delete this sublet request?',
      'You can create a fresh request later if you still need the sublet.',
      'Delete request',
      () => this.mutate(this.api.deleteSublet(row['id']))
    ),
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
  configMap = computed(() => buildModuleConfig(
    this.auth.role(),
    this.pgs().map(pg => String(pg.id)),
    option => this.pgName(option),
    option => this.pgSearchText(option),
    this.tenants().map(tenant => String(tenant.userId)),
    option => this.tenantName(option),
    option => this.tenantSearchText(option)
  ));
  config = computed(() => this.configMap()[this.moduleKey()]);
  visibleFields = computed(() => (this.config().fields || [])
    .filter(field => !field.show || field.show(this.auth.role()))
    .map(field => this.decorateDateField(field)));
  filteredRows = computed(() => {
    this.nowMs();
    const q = this.query.toLowerCase().trim();
    let rows = q ? this.rows().filter(row => JSON.stringify(row).toLowerCase().includes(q)) : this.rows();
    if (this.moduleKey() === 'notices') {
      rows = rows.filter(row => this.noticeFilter() === 'ALL' || this.noticeDeliveryState(row) === this.noticeFilter());
    }
    return rows;
  });
  noticeRowsForCounts = computed(() => {
    this.nowMs();
    const q = this.query.toLowerCase().trim();
    return q ? this.rows().filter(row => JSON.stringify(row).toLowerCase().includes(q)) : this.rows();
  });
  managerCreatedNoticeRows = computed(() => this.filteredRows().filter(row => !!row['isPublisher']));
  managerReceivedNoticeRows = computed(() => this.filteredRows().filter(row => !row['isPublisher']));
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
  managerCreatedNoticeColumns = computed(() => ['title', 'content', 'targetType', 'deliveryStatus', 'timeRemaining', 'scheduledAt', 'readCount']);
  managerReceivedNoticeColumns = computed(() => ['readStatus', 'title', 'content', 'targetType', 'deliveryStatus', 'timeRemaining', 'createdByName', 'scheduledAt']);
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
        if (!this.form['targetPgId'] && pgs.length) this.form['targetPgId'] = pgs[0].id;
        if (this.moduleKey() === 'menu') this.load();
      },
      error: () => undefined
    });
    if (this.auth.role() === 'OWNER' || this.auth.role() === 'MANAGER') {
      this.api.listTenants().subscribe({
        next: tenants => {
          this.tenants.set(tenants);
          if (!this.form['targetUserId'] && tenants.length) this.form['targetUserId'] = tenants[0].userId;
        },
        error: () => undefined
      });
    }
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
        const nextRows = Array.isArray(rows) ? rows as Row[] : [];
        this.rows.set(key === 'notices' ? this.enrichNoticeRows(nextRows) : nextRows);
        this.paymentSummary.set(null);
        this.paymentTransactions.set([]);
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
          ? this.api.createNotice({
              title: this.form['title'],
              content: this.form['content'],
              targetType: this.form['targetType'],
              targetPgId: this.form['targetType'] === 'SPECIFIC_PG' ? this.optionalNumber('targetPgId') : undefined,
              targetUserId: this.form['targetType'] === 'SPECIFIC_TENANT' ? this.optionalNumber('targetUserId') : undefined,
              scheduledAt: this.noticeScheduledAt()
            })
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
    if (this.moduleKey() === 'notices' && col === 'content') {
      return this.truncateNoticeText(row[col]);
    }
    if (this.moduleKey() === 'notices' && col === 'deliveryStatus') {
      return this.noticeDeliveryState(row) === 'SCHEDULED' ? 'Scheduled' : 'Sent';
    }
    if (this.moduleKey() === 'notices' && col === 'timeRemaining') {
      return this.noticeTimerLabel(row);
    }
    if (this.moduleKey() === 'notices' && col === 'readStatus') {
      return this.noticeReadStatus(row);
    }
    if (this.moduleKey() === 'notices' && col === 'readCount' && !row['isPublisher']) {
      return '-';
    }
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

  statusColumn(col: string): boolean {
    return isStatusColumn(col) || (this.moduleKey() === 'notices' && ['targetType', 'deliveryStatus', 'readStatus'].includes(col));
  }
  pillClass(status: unknown): string { return pillClassForStatus(status); }
  cellClass(row: Row, col: string): string {
    if (this.moduleKey() === 'notices' && col === 'title' && this.noticeDeliveryState(row) === 'SCHEDULED') {
      return 'cell--notice-scheduled';
    }
    return '';
  }

  noticeFilterLabel(filter: NoticeFilter): string {
    return filter === 'ALL' ? 'All' : filter === 'SCHEDULED' ? 'Scheduled' : 'Sent';
  }

  noticeFilterCount(filter: NoticeFilter): number {
    const rows = this.noticeRowsForCounts();
    if (filter === 'ALL') return rows.length;
    return rows.filter(row => this.noticeDeliveryState(row) === filter).length;
  }

  private resetForm() {
    this.form = {
      category: 'MAINTENANCE',
      targetType: this.auth.role() === 'MANAGER' ? 'SPECIFIC_PG' : 'ALL_PGS',
      serviceType: 'CLEANING',
      preferredTimeWindow: '6:00 PM - 8:00 PM',
      amenityType: 'WASHING_MACHINE',
      capacity: 1,
      dayOfWeek: 'MONDAY',
      mealType: 'BREAKFAST',
      isVeg: true,
      intendedVacateDate: this.minimumVacateDateIso(),
      pgId: this.auth.role() === 'TENANT' ? this.tenantProfile()?.pgId : this.pgs()[0]?.id,
      targetPgId: this.pgs()[0]?.id,
      targetUserId: this.tenants()[0]?.userId,
      scheduleNotice: false,
      scheduledDate: '',
      scheduledTime: ''
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

  private pgSearchText(value: string): string {
    const id = Number(value);
    const pg = this.pgs().find(item => item.id === id);
    return pg ? `${pg.id} ${pg.name} ${pg.address}` : value;
  }

  private tenantName(value: string): string {
    const id = Number(value);
    const tenant = this.tenants().find(item => item.userId === id);
    if (!tenant) return `Tenant ${value}`;
    const room = tenant.roomNumber ? ` · Room ${tenant.roomNumber}` : '';
    const pg = tenant.pgName ? ` · ${tenant.pgName}` : '';
    return `${tenant.name}${room}${pg}`;
  }

  private tenantSearchText(value: string): string {
    const id = Number(value);
    const tenant = this.tenants().find(item => item.userId === id);
    if (!tenant) return value;
    return [
      tenant.userId,
      tenant.tenantProfileId,
      tenant.name,
      tenant.email,
      tenant.phone,
      tenant.pgId,
      tenant.pgName,
      tenant.roomId,
      tenant.roomNumber
    ].filter(item => item !== undefined && item !== null && item !== '').join(' ');
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

  private openRatingDialog(title: string, subtitle: string, label: string, confirmLabel: string, factory: (value: number) => { subscribe: (handlers: { next: () => void; error: (err: any) => void }) => void }, initialValue?: number) {
    this.numberActionFactory = factory;
    this.textActionFactory = null;
    this.actionDialogEyebrow.set(this.config().title);
    this.actionDialogTitle.set(title);
    this.actionDialogSubtitle.set(subtitle);
    this.actionDialogLabel.set(label);
    this.actionDialogConfirmLabel.set(confirmLabel);
    this.actionDialogType.set('rating');
    this.actionDialogValue = initialValue && initialValue > 0 ? String(Math.round(initialValue)) : '';
    this.actionDialogOpen.set(true);
  }

  closeActionDialog() {
    this.actionDialogOpen.set(false);
    this.textActionFactory = null;
    this.numberActionFactory = null;
    this.actionDialogValue = '';
  }

  selectedRating(): number {
    const value = Number(this.actionDialogValue || 0);
    return Number.isFinite(value) ? Math.max(0, Math.min(5, Math.round(value))) : 0;
  }

  setRating(value: number) {
    this.actionDialogValue = String(value);
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

  subletCheckInMinDate(): string {
    return String(this.subletCheckInRow()?.['startDate'] || '');
  }

  subletCheckInMaxDate(): string {
    return String(this.subletCheckInRow()?.['endDate'] || '');
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
    const fieldError = this.validateVisibleFields();
    if (fieldError) return fieldError;
    if (key === 'vacate') {
      const date = String(this.form['intendedVacateDate'] || '');
      if (!date) return 'Choose an intended vacate date.';
      if (date < this.minimumVacateDateIso()) return 'Vacate date must be at least 15 days from today.';
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
    if (key === 'notices') {
      if (!String(this.form['title'] || '').trim()) return 'Enter a notice title.';
      if (!String(this.form['content'] || '').trim()) return 'Enter the notice message.';
      if (this.form['targetType'] === 'SPECIFIC_PG' && !this.optionalNumber('targetPgId')) return 'Choose a target PG.';
      if (this.form['targetType'] === 'SPECIFIC_TENANT' && !this.optionalNumber('targetUserId')) return 'Choose a target tenant.';
      const scheduledDate = String(this.form['scheduledDate'] || '').trim();
      const scheduledTime = String(this.form['scheduledTime'] || '').trim();
      if (this.form['scheduleNotice'] && (!scheduledDate || !scheduledTime)) return 'Choose both schedule date and schedule time.';
      if (!this.form['scheduleNotice'] && (scheduledDate || scheduledTime)) return 'Tick schedule notice before choosing a send time.';
      if (this.form['scheduleNotice'] && `${scheduledDate}T${scheduledTime}` <= this.localDateTimeInputValue()) {
        return 'Scheduled notice time must be in the future.';
      }
    }
    if (key === 'amenities') {
      const capacity = Number(this.form['capacity']);
      if (!Number.isInteger(capacity) || capacity < 1) return 'Units / seats must be at least 1.';
      if (!this.form['slotDate']) return 'Choose an amenity date.';
      if (String(this.form['slotDate']) < this.todayIso()) return 'Amenity date cannot be in the past.';
      if (!this.form['startTime'] || !this.form['endTime']) return 'Choose both start and end time.';
      if (String(this.form['endTime']) <= String(this.form['startTime'])) return 'End time must be after start time.';
    }
    if (key === 'sublets') {
      const startDate = String(this.form['startDate'] || '');
      const endDate = String(this.form['endDate'] || '');
      if (!startDate || !endDate) return 'Choose both sublet start and end dates.';
      if (startDate < this.todayIso()) return 'Sublet start date cannot be in the past.';
      if (endDate < startDate) return 'Sublet end date cannot be before the start date.';
      if (!String(this.form['reason'] || '').trim()) return 'Add a reason for the sublet request.';
    }
    return null;
  }

  private validateVisibleFields(): string | null {
    for (const field of this.visibleFields()) {
      if (field.type === 'checkbox' || field.required === false) continue;
      if (field.visibleWhen && !field.visibleWhen(this.form)) continue;
      const value = this.form[field.key];
      const text = String(value ?? '').trim();
      if (text === '') return `${field.label} is required.`;
      if (field.type === 'number') {
        const numberValue = Number(value);
        if (!Number.isFinite(numberValue)) return `${field.label} must be a valid number.`;
        if (field.min !== undefined && numberValue < Number(field.min)) return `${field.label} must be at least ${field.min}.`;
        if (field.max !== undefined && numberValue > Number(field.max)) return `${field.label} must be at most ${field.max}.`;
      }
      if ((field.type === 'date' || field.type === 'time') && field.min !== undefined && text < field.min) {
        return `${field.label} cannot be before ${field.min}.`;
      }
      if ((field.type === 'date' || field.type === 'time') && field.max !== undefined && text > field.max) {
        return `${field.label} cannot be after ${field.max}.`;
      }
      if (field.minLength && text.length < field.minLength) return `${field.label} must be at least ${field.minLength} characters.`;
      if (field.maxLength && text.length > field.maxLength) return `${field.label} must be at most ${field.maxLength} characters.`;
      if (field.pattern && !(new RegExp(`^${field.pattern}$`).test(text))) return `${field.label} is invalid.`;
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
      ? 'We will send this notice to the manager for review. The vacate date must be at least 15 days from today.'
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

  private minimumVacateDateIso(): string {
    const date = new Date();
    date.setDate(date.getDate() + 15);
    return date.toISOString().slice(0, 10);
  }

  private decorateDateField(field: FieldConfig): FieldConfig {
    if (field.type !== 'date') return field;
    if (this.moduleKey() === 'vacate' && field.key === 'intendedVacateDate') {
      return { ...field, min: this.minimumVacateDateIso() };
    }
    if (this.moduleKey() === 'services' && field.key === 'preferredDate') {
      return { ...field, min: this.todayIso() };
    }
    if (this.moduleKey() === 'sublets' && field.key === 'startDate') {
      return { ...field, min: this.todayIso() };
    }
    if (this.moduleKey() === 'sublets' && field.key === 'endDate') {
      return { ...field, min: this.todayIso(), minKey: 'startDate' };
    }
    if (this.moduleKey() === 'notices' && field.key === 'scheduledDate') {
      return { ...field, min: this.todayIso() };
    }
    return field;
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
    if (this.actionDialogType() === 'number' || this.actionDialogType() === 'rating') {
      if (!this.numberActionFactory) return;
      const value = Number(raw);
      if (this.actionDialogType() === 'rating') {
        if (!Number.isInteger(value) || value < 1 || value > 5) {
          this.snack.open('Choose a rating from 1 to 5 stars.', 'Dismiss', { duration: 2200, panelClass: 'pgms-snack' });
          return;
        }
      } else if (!Number.isFinite(value) || value <= 0) {
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

  showActionColumn(): boolean {
    if (this.moduleKey() !== 'notices') return true;
    if (this.auth.role() === 'TENANT') return false;
    return this.filteredRows().some(row => this.actions().some(action => action.show(row, this.auth.role())));
  }

  noticeRowsClickable(): boolean {
    return this.moduleKey() === 'notices';
  }

  handleRowClick(row: Row) {
    if (!this.noticeRowsClickable()) return;
    this.openNoticePreview(row);
  }

  closeNoticePreview() {
    this.noticePreviewOpen.set(false);
    this.noticePreviewRow.set(null);
  }

  noticePreviewTitle(): string {
    return String(this.noticePreviewRow()?.['title'] || 'Notice');
  }

  noticePreviewContent(): string {
    return String(this.noticePreviewRow()?.['content'] || 'No message provided.');
  }

  noticePreviewTimer(): string {
    const row = this.noticePreviewRow();
    if (!row || !row['scheduledAt']) return '';
    return this.noticeTimerLabel(row);
  }

  noticePreviewReadStatus(): string {
    const row = this.noticePreviewRow();
    if (!row || row['isPublisher']) return '';
    return this.noticeReadStatus(row);
  }

  noticePreviewSubtitle(): string {
    const row = this.noticePreviewRow();
    if (!row) return '';
    const publisher = String(row['createdByName'] || 'Publisher');
    const scheduledAt = this.value(row, 'scheduledAt');
    const status = this.value(row, 'deliveryStatus');
    if (scheduledAt && scheduledAt !== '-') return `${publisher} · ${status} · ${scheduledAt}`;
    const createdAt = this.value(row, 'createdAt');
    return createdAt && createdAt !== '-' ? `${publisher} · ${createdAt}` : publisher;
  }

  private openNoticePreview(row: Row) {
    this.noticePreviewRow.set(row);
    this.noticePreviewOpen.set(true);
    this.markNoticeRead(row);
  }

  private markNoticeRead(row: Row) {
    const id = Number(row['id']);
    if (!id || row['read'] || row['isPublisher']) return;
    this.rows.set(this.rows().map(item => Number(item['id']) === id ? { ...item, read: true } : item));
    if (Number(this.noticePreviewRow()?.['id']) === id) {
      this.noticePreviewRow.set({ ...row, read: true });
    }
    this.api.markNoticeRead(id).subscribe({
      error: () => {
        this.rows.set(this.rows().map(item => Number(item['id']) === id ? { ...item, read: false } : item));
        if (Number(this.noticePreviewRow()?.['id']) === id) {
          this.noticePreviewRow.set({ ...row, read: false });
        }
        this.snack.open('Could not send read receipt', 'Dismiss', { duration: 2600, panelClass: 'pgms-snack' });
      }
    });
  }

  private noticeReadStatus(row: Row): string {
    if (row['isPublisher']) return '-';
    return row['read'] ? 'Read' : 'Unread';
  }

  private truncateNoticeText(value: unknown): string {
    const text = String(value || '').trim();
    return text.length > 50 ? `${text.slice(0, 50).trimEnd()}...` : text || '-';
  }

  private noticeDeliveryState(row: Row): 'SCHEDULED' | 'SENT' {
    return this.noticeScheduledTime(row) > this.nowMs() ? 'SCHEDULED' : 'SENT';
  }

  private noticeTimerLabel(row: Row): string {
    const remainingMs = this.noticeScheduledTime(row) - this.nowMs();
    if (remainingMs <= 0) return 'Sent';
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }

  private noticeScheduledTime(row: Row): number {
    const value = String(row['scheduledAt'] || row['createdAt'] || '');
    const parsed = value ? new Date(value).getTime() : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private noticeScheduledAt(): string | undefined {
    const date = String(this.form['scheduledDate'] || '').trim();
    const time = String(this.form['scheduledTime'] || '').trim();
    return this.form['scheduleNotice'] && date && time ? `${date}T${time}` : undefined;
  }

  private localDateTimeInputValue(): string {
    const date = new Date();
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  }

  private enrichNoticeRows(rows: Row[]): Row[] {
    const currentUserId = this.auth.user()?.userId;
    return rows.map(row => ({
      ...row,
      isPublisher: !!currentUserId && Number(row['createdById']) === currentUserId
    }));
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

  ngOnDestroy() {
    clearInterval(this.noticeTimer);
  }
}
