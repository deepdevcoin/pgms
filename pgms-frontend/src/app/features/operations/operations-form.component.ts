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
            } @else if (field.type === 'time-dial') {
              <div class="time-picker">
                <button class="time-trigger" type="button" (click)="openTimePicker(field.key)">
                  <mat-icon>schedule</mat-icon>
                  <span>{{ displayTime(form[field.key]) }}</span>
                </button>
                @if (activeTimeKey === field.key) {
                  <div class="time-popover">
                    <div class="time-readout">
                      <button type="button" [class.time-readout--active]="timeMode === 'hour'" (click)="timeMode = 'hour'">{{ selectedHourLabel(field.key) }}</button>
                      <span>:</span>
                      <button type="button" [class.time-readout--active]="timeMode === 'minute'" (click)="timeMode = 'minute'">{{ selectedMinuteLabel(field.key) }}</button>
                      <div class="meridiem">
                        <button type="button" [class.meridiem--active]="selectedMeridiem(field.key) === 'AM'" (click)="setMeridiem(field.key, 'AM')">AM</button>
                        <button type="button" [class.meridiem--active]="selectedMeridiem(field.key) === 'PM'" (click)="setMeridiem(field.key, 'PM')">PM</button>
                      </div>
                    </div>
                    <div class="clock-face" [class.clock-face--minutes]="timeMode === 'minute'">
                      @if (timeMode === 'hour') {
                        @for (hour of hourOptions; track hour) {
                          <button
                            class="clock-tick"
                            type="button"
                            [class.clock-tick--active]="selectedHour12(field.key) === hour"
                            [style.left.%]="dialPosition(hour, 12).x"
                            [style.top.%]="dialPosition(hour, 12).y"
                            (click)="selectHour(field.key, hour)"
                          >{{ hour }}</button>
                        }
                      } @else {
                        @for (minute of minuteOptions; track minute) {
                          <button
                            class="clock-tick"
                            type="button"
                            [class.clock-tick--active]="selectedMinute(field.key) === minute"
                            [style.left.%]="dialPosition(minute || 60, 60).x"
                            [style.top.%]="dialPosition(minute || 60, 60).y"
                            (click)="selectMinute(field.key, minute)"
                          >{{ minute.toString().padStart(2, '0') }}</button>
                        }
                      }
                    </div>
                    <div class="time-actions">
                      <button type="button" class="time-action" (click)="activeTimeKey = ''">Done</button>
                    </div>
                  </div>
                }
              </div>
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
    .time-picker { position: relative; }
    .time-trigger {
      width: 100%;
      min-height: 41px;
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--bg);
      color: var(--text);
      padding: 0 12px;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
    }
    .time-trigger mat-icon { color: var(--primary); font-size: 18px; width: 18px; height: 18px; }
    .time-popover {
      position: absolute;
      z-index: 20;
      top: calc(100% + 8px);
      left: 0;
      width: 286px;
      max-width: min(286px, calc(100vw - 32px));
      padding: 14px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface);
      box-shadow: 0 18px 50px rgba(0,0,0,0.32);
    }
    .time-readout { display: grid; grid-template-columns: 58px 10px 58px 1fr; align-items: center; gap: 6px; margin-bottom: 12px; }
    .time-readout > button {
      height: 42px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text);
      font: inherit;
      font-size: 18px;
      font-weight: 800;
      cursor: pointer;
    }
    .time-readout > span { color: var(--text-muted); font-size: 20px; font-weight: 800; text-align: center; }
    .time-readout--active { border-color: rgba(96,165,250,0.54) !important; background: rgba(96,165,250,0.14) !important; color: #bfdbfe !important; }
    .meridiem { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .meridiem button {
      height: 32px;
      border-radius: 9px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text-muted);
      font: inherit;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
    }
    .meridiem .meridiem--active { border-color: rgba(34,197,94,0.38); background: rgba(34,197,94,0.14); color: #86efac; }
    .clock-face {
      position: relative;
      width: 238px;
      height: 238px;
      margin: 0 auto;
      border-radius: 999px;
      background: radial-gradient(circle at center, rgba(96,165,250,0.16) 0 8px, rgba(255,255,255,0.04) 9px 100%);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .clock-tick {
      position: absolute;
      transform: translate(-50%, -50%);
      width: 36px;
      height: 36px;
      border-radius: 999px;
      border: 0;
      background: transparent;
      color: var(--text);
      font: inherit;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
    }
    .clock-face--minutes .clock-tick { font-size: 11px; }
    .clock-tick:hover, .clock-tick--active { background: rgba(96,165,250,0.22); color: #dbeafe; }
    .time-actions { display: flex; justify-content: flex-end; margin-top: 12px; }
    .time-action {
      height: 32px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid rgba(96,165,250,0.42);
      background: rgba(96,165,250,0.14);
      color: #bfdbfe;
      font: inherit;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
    }
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
  activeTimeKey = '';
  timeMode: 'hour' | 'minute' = 'hour';
  readonly hourOptions = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  readonly minuteOptions = Array.from({ length: 12 }, (_, index) => index * 5);

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

  openTimePicker(key: string) {
    this.activeTimeKey = this.activeTimeKey === key ? '' : key;
    this.timeMode = 'hour';
    if (!this.form[key]) this.setTime(key, 9, 0);
  }

  selectHour(key: string, hour12: number) {
    const current = this.timeParts(key);
    const meridiem = current.hours >= 12 ? 'PM' : 'AM';
    let hours = hour12 % 12;
    if (meridiem === 'PM') hours += 12;
    this.setTime(key, hours, current.minutes);
    this.timeMode = 'minute';
  }

  selectMinute(key: string, minute: number) {
    const current = this.timeParts(key);
    this.setTime(key, current.hours, minute);
  }

  setMeridiem(key: string, meridiem: 'AM' | 'PM') {
    const current = this.timeParts(key);
    const hour12 = current.hours % 12 || 12;
    this.setTime(key, meridiem === 'AM' ? hour12 % 12 : (hour12 % 12) + 12, current.minutes);
  }

  selectedHour12(key: string): number {
    return this.timeParts(key).hours % 12 || 12;
  }

  selectedMinute(key: string): number {
    return this.timeParts(key).minutes;
  }

  selectedMeridiem(key: string): 'AM' | 'PM' {
    return this.timeParts(key).hours >= 12 ? 'PM' : 'AM';
  }

  selectedHourLabel(key: string): string {
    return String(this.selectedHour12(key)).padStart(2, '0');
  }

  selectedMinuteLabel(key: string): string {
    return String(this.selectedMinute(key)).padStart(2, '0');
  }

  displayTime(value: unknown): string {
    const { hours, minutes } = this.parseTime(String(value || '09:00'));
    const suffix = hours >= 12 ? 'PM' : 'AM';
    return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  dialPosition(value: number, steps: number): { x: number; y: number } {
    const angle = (value / steps) * Math.PI * 2 - Math.PI / 2;
    const radius = 40;
    return {
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius
    };
  }

  private timeParts(key: string): { hours: number; minutes: number } {
    return this.parseTime(String(this.form[key] || '09:00'));
  }

  private parseTime(value: string): { hours: number; minutes: number } {
    const [hoursRaw, minutesRaw] = value.split(':').map(Number);
    const hours = Number.isFinite(hoursRaw) ? Math.max(0, Math.min(23, hoursRaw)) : 9;
    const minutes = Number.isFinite(minutesRaw) ? Math.max(0, Math.min(59, Math.round(minutesRaw / 5) * 5)) : 0;
    return { hours, minutes: minutes === 60 ? 55 : minutes };
  }

  private setTime(key: string, hours: number, minutes: number) {
    this.form[key] = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
}
