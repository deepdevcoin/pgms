import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PaymentTransaction } from '../../core/models';
import { OperationsTableComponent } from './operations-table.component';
import { Row, SummaryCard } from './operations.types';

@Component({
  selector: 'app-operations-payment-overview',
  standalone: true,
  imports: [CommonModule, OperationsTableComponent],
  template: `
    @if (showSummary) {
      <section class="overview-shell">
        <div class="summary-grid">
          @for (card of summaryCards; track card.label) {
            <div class="summary-card card" [class.summary-card--money]="card.money">
              <div class="summary-label">{{ card.label }}</div>
              <div class="summary-value" [class.money]="card.money">{{ card.value }}</div>
              @if (card.meta) {
                <div class="summary-meta">{{ card.meta }}</div>
              }
            </div>
          }
        </div>
      </section>
    }

    @if (showLedger) {
      <section class="ledger card">
        <div class="section-head">
          <div>
            <div class="crumb">Ledger</div>
            <h2>Transaction History</h2>
            <div class="section-sub">
              {{ transactions.length }} entr{{ transactions.length === 1 ? 'y' : 'ies' }}. Every rent charge, payment, waiver, and adjustment in one place.
            </div>
          </div>
        </div>
        @if (transactions.length === 0) {
          <div class="state"><span>No transactions recorded yet.</span></div>
        } @else {
          <app-operations-table
            [columns]="columns"
            [rows]="transactions"
            [showActions]="false"
            [compact]="true"
            [moduleKey]="'payments'"
            [label]="label"
            [value]="value"
            [rowKey]="rowKey"
            [moneyColumn]="moneyColumn"
            [cellClass]="cellClass.bind(this)"
            [minWidth]="'100%'"
          />
        }
      </section>
    }
  `,
  styles: [`
    .overview-shell { display: flex; flex-direction: column; gap: 14px; }
    .summary-grid { display: grid; grid-template-columns: repeat(6, minmax(150px, 1fr)); gap: 12px; }
    @media (max-width: 1100px) { .summary-grid { grid-template-columns: repeat(3, minmax(170px, 1fr)); } }
    @media (max-width: 720px) { .summary-grid { grid-template-columns: 1fr 1fr; } }
    .summary-card { padding: 15px 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; min-height: 108px; border-radius: 8px; position: relative; overflow: hidden; }
    .summary-card::after { content: ''; position: absolute; inset: 0 auto 0 0; width: 3px; background: rgba(255,255,255,0.08); }
    .summary-card--money::after { background: linear-gradient(180deg, var(--primary), rgba(96,165,250,0.18)); }
    .summary-label { color: var(--text-muted); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; }
    .summary-value { font-size: 24px; font-weight: 800; line-height: 1.1; }
    .summary-meta { color: var(--text-muted); font-size: 12px; line-height: 1.4; }
    .ledger { display: flex; flex-direction: column; gap: 14px; margin-top: 18px; padding: 18px; border-radius: 8px; }
    .section-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .crumb { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    .section-head h2 { margin: 6px 0 0; font-size: 20px; letter-spacing: -0.02em; }
    .section-sub { color: var(--text-muted); font-size: 13px; margin-top: 6px; max-width: 820px; }
    .state { min-height: 180px; display: grid; place-items: center; gap: 10px; padding: 28px; color: var(--text-muted); text-align: center; border: 1px dashed var(--border); border-radius: 8px; background: rgba(255,255,255,0.02); }
    :host ::ng-deep .tx-impact { font-weight: 700; }
    :host ::ng-deep .tx-impact--positive { color: var(--danger); }
    :host ::ng-deep .tx-impact--negative { color: var(--status-vacant-text); }
  `]
})
export class OperationsPaymentOverviewComponent {
  @Input() summaryCards: SummaryCard[] = [];
  @Input() transactions: PaymentTransaction[] = [];
  @Input() columns: string[] = [];
  @Input() showSummary = true;
  @Input() showLedger = true;
  @Input() label: (col: string) => string = (col: string) => col;
  @Input() transactionValue: (tx: PaymentTransaction, col: string) => string = () => '-';
  @Input() moneyColumn: (col: string) => boolean = () => false;
  value = (row: Row, col: string) => this.transactionValue(row as PaymentTransaction, col);
  rowKey = (row: Row) => String((row as PaymentTransaction).id);

  cellClass(row: Row, col: string): string {
    const tx = row as PaymentTransaction;
    if (col !== 'signedAmount') return '';
    return tx.signedAmount > 0 ? 'tx-impact tx-impact--positive' : 'tx-impact tx-impact--negative';
  }
}
