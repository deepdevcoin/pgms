import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { formatDisplayDate } from './date-utils';

@Component({
  selector: 'app-date-input',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="date-field">
      <input
        class="date-display"
        [value]="displayValue()"
        [placeholder]="placeholder"
        [disabled]="disabled"
        readonly
        (click)="openPicker()"
      />
      <button class="date-trigger" type="button" [disabled]="disabled" (click)="openPicker()" aria-label="Open calendar">
        <mat-icon>calendar_month</mat-icon>
      </button>
      <input
        #nativeInput
        class="date-native"
        type="date"
        [ngModel]="value"
        (ngModelChange)="onValueChange($event)"
        [attr.min]="min || null"
        [attr.max]="max || null"
        [disabled]="disabled"
        tabindex="-1"
      />
    </div>
  `,
  styles: [`
    .date-field { position: relative; display: flex; align-items: center; }
    .date-display {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 10px;
      padding: 10px 42px 10px 12px;
      font-family: inherit;
      cursor: pointer;
    }
    .date-trigger {
      position: absolute;
      right: 8px;
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      border: 0;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
    }
    .date-trigger mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .date-native {
      position: absolute;
      inset: 0;
      opacity: 0;
      pointer-events: none;
      width: 0;
      height: 0;
    }
  `]
})
export class DateInputComponent {
  @Input() value = '';
  @Input() placeholder = 'dd/MM/yyyy';
  @Input() disabled = false;
  @Input() min = '';
  @Input() max = '';
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('nativeInput') nativeInput?: ElementRef<HTMLInputElement>;

  displayValue(): string {
    return formatDisplayDate(this.value);
  }

  openPicker() {
    if (this.disabled) return;
    const input = this.nativeInput?.nativeElement;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
    input.click();
  }

  onValueChange(value: string) {
    this.valueChange.emit(value);
  }
}
