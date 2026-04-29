import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DateInputComponent } from '../../shared/date-input.component';
import { FieldConfig } from './operations.types';

@Component({
  selector: 'app-operations-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DateInputComponent],
  template: `
    <form class="form card" (ngSubmit)="submitForm.emit()" data-testid="ops-form">
      @for (field of fields; track field.key) {
        <label class="fld" [class.wide]="field.type === 'textarea' || field.wide">
          <span>{{ field.label }}</span>
          @if (field.type === 'textarea') {
            <textarea [(ngModel)]="form[field.key]" [name]="field.key"></textarea>
          } @else if (field.type === 'select') {
            <select [(ngModel)]="form[field.key]" [name]="field.key">
              @for (option of field.options || []; track option) {
                <option [value]="option">{{ field.optionLabel ? field.optionLabel(option) : option }}</option>
              }
            </select>
          } @else if (field.type === 'date') {
            <app-date-input [(value)]="form[field.key]" [min]="field.min || ''" [max]="field.max || ''"></app-date-input>
          } @else if (field.type === 'checkbox') {
            <input type="checkbox" [(ngModel)]="form[field.key]" [name]="field.key" />
          } @else {
            <input [type]="field.type" [(ngModel)]="form[field.key]" [name]="field.key" />
          }
        </label>
      }
      <button type="button" class="btn" *ngIf="showLoadWeek" (click)="loadWeek.emit()">Load week</button>
      <button class="btn btn--primary" type="submit" [disabled]="saving">
        <mat-icon>check</mat-icon>
        <span>{{ saving ? 'Saving...' : 'Save' }}</span>
      </button>
    </form>
  `,
  styles: [`
    .form { display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 12px; padding: 16px; align-items: end; }
    @media (max-width: 960px) { .form { grid-template-columns: 1fr; } }
    .fld { display: flex; flex-direction: column; gap: 6px; }
    .fld.wide { grid-column: span 2; }
    .fld span { font-size: 11px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; }
    input, select, textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 10px; padding: 10px 12px; font-family: inherit; }
    textarea { min-height: 84px; resize: vertical; }
    input[type="checkbox"] { width: 18px; height: 18px; }
  `]
})
export class OperationsFormComponent {
  @Input() fields: FieldConfig[] = [];
  @Input() form: Record<string, any> = {};
  @Input() saving = false;
  @Input() showLoadWeek = false;

  @Output() submitForm = new EventEmitter<void>();
  @Output() loadWeek = new EventEmitter<void>();
}
