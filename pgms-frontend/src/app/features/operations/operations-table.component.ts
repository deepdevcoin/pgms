import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Role } from '../../core/models';
import { ActionConfig, ModuleKey, Row } from './operations.types';

@Component({
  selector: 'app-operations-table',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="table card" data-testid="ops-table">
      <div class="thead" [style.--cols]="columns.length">
        @for (col of columns; track col) { <div>{{ label(col) }}</div> }
        <div>Actions</div>
      </div>
      @for (row of rows; track rowKey(row)) {
        <div class="tr" [style.--cols]="columns.length">
          @for (col of columns; track col) {
            <div [class.money]="moneyColumn(col)">
              @if (statusColumn(col)) {
                <span class="pill dot" [ngClass]="pillClass((row[col]))">{{ row[col] || '-' }}</span>
              } @else {
                {{ value(row, col) }}
              }
            </div>
          }
          <div class="actions">
            @for (action of actions; track action.label) {
              @if (action.show(row, role)) {
                <button class="icon" type="button" (click)="action.run(row)" [title]="action.label" [class.action-pill]="moduleKey === 'payments'">
                  <mat-icon>{{ action.icon }}</mat-icon>
                  @if (moduleKey === 'payments') { <span>{{ action.label }}</span> }
                </button>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
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
    .pill--paid, .pill--resolved, .pill--completed, .pill--approved { background: var(--status-vacant-bg); border-color: var(--status-vacant-border); color: var(--status-vacant-text); }
    .pill--pending, .pill--requested, .pill--open { background: var(--status-vacating-bg); border-color: var(--status-vacating-border); color: var(--status-vacating-text); }
    .pill--overdue, .pill--rejected, .pill--escalated { background: rgba(248,113,113,0.14); border-color: rgba(248,113,113,0.5); color: var(--danger); }
    .pill--partial, .pill--confirmed, .pill--in_progress { background: var(--status-occupied-bg); border-color: var(--status-occupied-border); color: var(--status-occupied-text); }
  `]
})
export class OperationsTableComponent {
  @Input() columns: string[] = [];
  @Input() rows: Row[] = [];
  @Input() actions: ActionConfig[] = [];
  @Input() role: Role | null = null;
  @Input() moduleKey: ModuleKey = 'complaints';
  @Input() label: (col: string) => string = (col: string) => col;
  @Input() value: (row: Row, col: string) => string = () => '-';
  @Input() rowKey: (row: Row) => string = (row: Row) => JSON.stringify(row);
  @Input() moneyColumn: (col: string) => boolean = () => false;
  @Input() statusColumn: (col: string) => boolean = () => false;
  @Input() pillClass: (status: unknown) => string = () => '';
}
