import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PaymentTransaction } from '../../core/models';
import { SummaryCard } from './operations.types';

@Component({
  selector: 'app-operations-payment-overview',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="summary-grid">
      @for (card of summaryCards; track card.label) {
        <div class="summary-card card">
          <div class="summary-label">{{ card.label }}</div>
          <div class="summary-value" [class.money]="card.money">{{ card.value }}</div>
          @if (card.meta) {
            <div class="summary-meta">{{ card.meta }}</div>
          }
        </div>
      }
    </div>

    <section class="ledger">
      <div class="section-head">
        <div>
          <div class="crumb">Ledger</div>
          <h2>Transaction History</h2>
        </div>
        <div class="ledger-count">{{ transactions.length }} entries</div>
      </div>
      @if (transactions.length === 0) {
        <div class="state card"><mat-icon>receipt_long</mat-icon><span>No transactions recorded yet.</span></div>
      } @else {
        <div class="table card">
          <div class="thead tx-head" [style.--tx-cols]="columns.length">
            @for (col of columns; track col) { <div>{{ label(col) }}</div> }
          </div>
          @for (tx of transactions; track tx.id) {
            <div class="tr tx-row" [style.--tx-cols]="columns.length">
              @for (col of columns; track col) {
                <div [class.money]="moneyColumn(col)">{{ transactionValue(tx, col) }}</div>
              }
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .summary-grid { display: grid; grid-template-columns: repeat(6, minmax(150px, 1fr)); gap: 12px; }
    @media (max-width: 1100px) { .summary-grid { grid-template-columns: repeat(3, minmax(160px, 1fr)); } }
    @media (max-width: 720px) { .summary-grid { grid-template-columns: 1fr 1fr; } }
    .summary-card { padding: 16px; display: flex; flex-direction: column; gap: 6px; min-height: 112px; }
    .summary-label { color: var(--text-muted); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; }
    .summary-value { font-size: 26px; font-weight: 800; }
    .summary-meta { color: var(--text-muted); font-size: 12px; }
    .ledger { display: flex; flex-direction: column; gap: 12px; margin-top: 18px; }
    .section-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .crumb { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    .section-head h2 { margin: 6px 0 0; font-size: 22px; letter-spacing: -0.02em; }
    .ledger-count { color: var(--text-muted); font-size: 12px; }
    .state { min-height: 180px; display: grid; place-items: center; gap: 10px; padding: 28px; color: var(--text-muted); text-align: center; }
    .table { overflow: auto; }
    .thead, .tr { display: grid; grid-template-columns: repeat(var(--tx-cols, 8), minmax(150px, 1fr)); gap: 10px; align-items: center; min-width: 1100px; }
    .thead { padding: 12px 16px; color: var(--text-muted); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid var(--border); }
    .tr { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; }
    .tr:last-child { border-bottom: 0; }
    .money { font-family: var(--font-mono); }
  `]
})
export class OperationsPaymentOverviewComponent {
  @Input() summaryCards: SummaryCard[] = [];
  @Input() transactions: PaymentTransaction[] = [];
  @Input() columns: string[] = [];
  @Input() label: (col: string) => string = (col: string) => col;
  @Input() transactionValue: (tx: PaymentTransaction, col: string) => string = () => '-';
  @Input() moneyColumn: (col: string) => boolean = () => false;
}
