import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PgCreatePayload } from '../../core/models';

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <form #propertyForm="ngForm" class="form" novalidate (ngSubmit)="submit(propertyForm)">
      @if (errorMessage) {
        <div class="feedback feedback--error" role="alert">
          <mat-icon>error</mat-icon>
          <span>{{ errorMessage }}</span>
        </div>
      }

      <section class="group">
        <div class="group-head">
          <div class="group-title">Property basics</div>
          <p class="group-copy">Start with the details your team and residents already recognize.</p>
        </div>

        <div class="grid">
          <label class="fld wide">
            <span>Property name</span>
            <input
              #nameModel="ngModel"
              [(ngModel)]="model.name"
              name="name"
              type="text"
              maxlength="80"
              required
            />
            <small>Use the visible name for this PG.</small>
            @if (showError(nameModel)) {
              <em>Name is required.</em>
            }
          </label>

          <label class="fld wide">
            <span>Address</span>
            <textarea
              #addressModel="ngModel"
              [(ngModel)]="model.address"
              name="address"
              rows="3"
              maxlength="220"
              required
            ></textarea>
            <small>Keep it concise and easy to scan.</small>
            @if (showError(addressModel)) {
              <em>Address is required.</em>
            }
          </label>

          <label class="fld">
            <span>Total floors</span>
            <input
              #floorsModel="ngModel"
              [(ngModel)]="model.totalFloors"
              name="totalFloors"
              type="number"
              min="1"
              max="30"
              required
            />
            <small>Rooms can be added later from Layout.</small>
            @if (showError(floorsModel)) {
              <em>Enter at least 1 floor.</em>
            }
          </label>
        </div>
      </section>

      <section class="group">
        <div class="group-head">
          <div class="group-title">Operations defaults</div>
          <p class="group-copy">Set the timing and service rules this property should follow.</p>
        </div>

        <div class="grid grid--three">
          <label class="fld">
            <span>Rent deadline day</span>
            <input
              #deadlineModel="ngModel"
              [(ngModel)]="model.paymentDeadlineDay"
              name="paymentDeadlineDay"
              type="number"
              min="1"
              max="28"
              required
            />
            <small>Choose a day that fits every month.</small>
            @if (showError(deadlineModel)) {
              <em>Pick a day from 1 to 28.</em>
            }
          </label>

          <label class="fld">
            <span>Fine per day</span>
            <input
              #fineModel="ngModel"
              [(ngModel)]="model.fineAmountPerDay"
              name="fineAmountPerDay"
              type="number"
              min="0"
              required
            />
            <small>Late fee applied for overdue rent.</small>
            @if (showError(fineModel)) {
              <em>Fine per day cannot be negative.</em>
            }
          </label>

          <label class="fld">
            <span>Service SLA hours</span>
            <input
              #slaModel="ngModel"
              [(ngModel)]="model.slaHours"
              name="slaHours"
              type="number"
              min="1"
              max="168"
              required
            />
            <small>Used by service operations and tracking.</small>
            @if (showError(slaModel)) {
              <em>Enter at least 1 hour.</em>
            }
          </label>
        </div>
      </section>

      <div class="note" *ngIf="noteText">
        <mat-icon>tips_and_updates</mat-icon>
        <span>{{ noteText }}</span>
      </div>

      <div class="actions">
        <button class="btn btn--ghost" type="button" *ngIf="showCancel" (click)="cancelled.emit()" [disabled]="saving">Cancel</button>
        <button class="btn btn--primary" type="submit" [disabled]="saving">
          <mat-icon>check</mat-icon>
          <span>{{ saving ? savingLabel : submitLabel }}</span>
        </button>
      </div>
    </form>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 18px; }
    .group { display: flex; flex-direction: column; gap: 14px; }
    .group-head { display: flex; flex-direction: column; gap: 4px; }
    .group-title { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); font-weight: 700; }
    .group-copy { margin: 0; color: var(--text-muted); font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .grid--three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .fld { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .fld.wide { grid-column: span 2; }
    .fld span { font-size: 11px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; }
    .fld small { color: var(--text-dim); font-size: 12px; }
    .fld em { color: #fca5a5; font-style: normal; font-size: 12px; }
    input, textarea {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 10px;
      padding: 10px 12px;
      font-family: inherit;
    }
    textarea { resize: vertical; min-height: 86px; }
    .feedback, .note {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--bg-elev);
      font-size: 13px;
    }
    .feedback--error {
      border-color: rgba(248,113,113,0.32);
      background: rgba(248,113,113,0.08);
      color: #fecaca;
    }
    .feedback mat-icon, .note mat-icon { font-size: 18px; width: 18px; height: 18px; margin-top: 1px; }
    .note { color: var(--text-muted); }
    .note mat-icon { color: var(--primary); }
    .actions { display: flex; justify-content: flex-end; gap: 10px; }
    @media (max-width: 720px) {
      .grid, .grid--three { grid-template-columns: 1fr; }
      .fld.wide { grid-column: auto; }
      .actions { flex-direction: column-reverse; }
      .actions button { width: 100%; justify-content: center; }
    }
  `]
})
export class PropertyFormComponent {
  @Input() model: PgCreatePayload = this.blankModel();
  @Input() saving = false;
  @Input() errorMessage = '';
  @Input() submitLabel = 'Create property';
  @Input() savingLabel = 'Creating...';
  @Input() noteText = 'The property will be created first. Rooms, managers, and tenants can be added afterward.';
  @Input() showCancel = true;
  @Output() submitted = new EventEmitter<PgCreatePayload>();
  @Output() cancelled = new EventEmitter<void>();

  attempted = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['model']) {
      this.attempted = false;
    }
  }

  submit(form: NgForm) {
    this.attempted = true;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.submitted.emit({
      name: this.model.name.trim(),
      address: this.model.address.trim(),
      totalFloors: Number(this.model.totalFloors),
      paymentDeadlineDay: Number(this.model.paymentDeadlineDay),
      fineAmountPerDay: Number(this.model.fineAmountPerDay),
      slaHours: Number(this.model.slaHours)
    });
  }

  showError(control: NgModel | null): boolean {
    return !!control?.invalid && (this.attempted || !!control.touched);
  }

  private blankModel(): PgCreatePayload {
    return {
      name: '',
      address: '',
      totalFloors: 1,
      paymentDeadlineDay: 5,
      fineAmountPerDay: 100,
      slaHours: 48
    };
  }
}
