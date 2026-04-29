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
        @if (!field.visibleWhen || field.visibleWhen(form)) {
          <label class="fld" [class.wide]="field.type === 'textarea' || field.wide">
            <span>{{ field.label }}</span>
            @if (field.type === 'textarea') {
              <textarea
                [(ngModel)]="form[field.key]"
                [name]="field.key"
                [required]="field.required !== false"
                [attr.minlength]="field.minLength || null"
                [attr.maxlength]="field.maxLength || null"
              ></textarea>
            } @else if (field.type === 'search-select') {
              <div class="search-select">
                <input
                  type="search"
                  [(ngModel)]="search[field.key]"
                  [name]="field.key + 'Search'"
                  placeholder="Search"
                />
                <select [(ngModel)]="form[field.key]" [name]="field.key" size="5" [required]="field.required !== false">
                  @for (option of filteredOptions(field); track option) {
                    <option [value]="option">{{ field.optionLabel ? field.optionLabel(option) : option }}</option>
                  }
                </select>
              </div>
            } @else if (field.type === 'select') {
              <select [(ngModel)]="form[field.key]" [name]="field.key" [required]="field.required !== false">
                @for (option of field.options || []; track option) {
                  <option [value]="option">{{ field.optionLabel ? field.optionLabel(option) : option }}</option>
                }
              </select>
            } @else if (field.type === 'date') {
              <app-date-input
                [(value)]="form[field.key]"
                [min]="field.minKey ? (form[field.minKey] || field.min || '') : (field.min || '')"
                [max]="field.maxKey ? (form[field.maxKey] || field.max || '') : (field.max || '')"
              ></app-date-input>
            } @else if (field.type === 'checkbox') {
              <input type="checkbox" [(ngModel)]="form[field.key]" [name]="field.key" />
            } @else {
              <input
                [type]="field.type"
                [(ngModel)]="form[field.key]"
                [name]="field.key"
                [required]="field.required !== false"
                [attr.min]="field.min || null"
                [attr.max]="field.max || null"
                [attr.step]="field.step || null"
                [attr.minlength]="field.minLength || null"
                [attr.maxlength]="field.maxLength || null"
                [attr.pattern]="field.pattern || null"
              />
            }
          </label>
        }
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
    .search-select { display: grid; gap: 8px; }
    .search-select select { min-height: 156px; }
    textarea { min-height: 84px; resize: vertical; }
    input[type="checkbox"] { width: 18px; height: 18px; }
  `]
})
export class OperationsFormComponent {
  @Input() fields: FieldConfig[] = [];
  @Input() form: Record<string, any> = {};
  @Input() saving = false;
  @Input() showLoadWeek = false;
  search: Record<string, string> = {};

  @Output() submitForm = new EventEmitter<void>();
  @Output() loadWeek = new EventEmitter<void>();

  filteredOptions(field: FieldConfig): string[] {
    const query = String(this.search[field.key] || '').toLowerCase().trim();
    const options = field.options || [];
    if (!query) return options;
    return options.filter(option => {
      const label = field.optionLabel ? field.optionLabel(option) : option;
      const searchText = field.optionSearchText ? field.optionSearchText(option) : label;
      return `${option} ${label} ${searchText}`.toLowerCase().includes(query);
    });
  }
}
