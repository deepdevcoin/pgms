import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CleaningStatus, RoomCreatePayload, RoomMutableStatus, SharingType } from '../../core/models';

type RoomFormValue = RoomCreatePayload;

@Component({
  selector: 'app-property-room-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <form #roomForm="ngForm" class="form" novalidate (ngSubmit)="submit(roomForm)">
      @if (errorMessage) {
        <div class="feedback feedback--error" role="alert">
          <mat-icon>error</mat-icon>
          <span>{{ errorMessage }}</span>
        </div>
      }

      <section class="group">
        <div class="group-head">
          <div class="group-title">Room identity</div>
          <p class="group-copy">Set how this room should appear across layout, pricing, and onboarding flows.</p>
        </div>

        <div class="grid">
          <label class="fld">
            <span>Room number</span>
            <input #roomNumberModel="ngModel" [(ngModel)]="model.roomNumber" name="roomNumber" maxlength="20" required />
            @if (showError(roomNumberModel)) {
              <em>Room number is required.</em>
            }
          </label>

          <label class="fld">
            <span>Floor</span>
            <input #floorModel="ngModel" [(ngModel)]="model.floor" name="floor" type="number" min="1" required />
            @if (showError(floorModel)) {
              <em>Enter a floor number of 1 or higher.</em>
            }
          </label>

          <label class="fld">
            <span>Sharing type</span>
            <select #sharingModel="ngModel" [(ngModel)]="model.sharingType" name="sharingType" required>
              @for (option of sharingTypes; track option) {
                <option [ngValue]="option">{{ option }}</option>
              }
            </select>
            @if (showError(sharingModel)) {
              <em>Choose a sharing type.</em>
            }
          </label>

          <label class="fld">
            <span>Room status</span>
            <select #statusModel="ngModel" [(ngModel)]="model.status" name="status" required>
              @for (option of roomStatuses; track option) {
                <option [ngValue]="option">{{ option }}</option>
              }
            </select>
            @if (showError(statusModel)) {
              <em>Choose a room status.</em>
            }
          </label>
        </div>
      </section>

      <section class="group">
        <div class="group-head">
          <div class="group-title">Pricing</div>
          <p class="group-copy">These values flow into tenant onboarding and the room layout view.</p>
        </div>

        <div class="grid">
          <label class="fld">
            <span>Monthly rent</span>
            <input #rentModel="ngModel" [(ngModel)]="model.monthlyRent" name="monthlyRent" type="number" min="1" required />
            @if (showError(rentModel)) {
              <em>Monthly rent must be greater than zero.</em>
            }
          </label>

          <label class="fld">
            <span>Deposit amount</span>
            <input #depositModel="ngModel" [(ngModel)]="model.depositAmount" name="depositAmount" type="number" min="1" required />
            @if (showError(depositModel)) {
              <em>Deposit amount must be greater than zero.</em>
            }
          </label>

          <label class="fld">
            <span>Cleaning status</span>
            <select #cleaningModel="ngModel" [(ngModel)]="model.cleaningStatus" name="cleaningStatus" required>
              @for (option of cleaningStatuses; track option) {
                <option [ngValue]="option">{{ option }}</option>
              }
            </select>
            @if (showError(cleaningModel)) {
              <em>Choose a cleaning status.</em>
            }
          </label>

          <label class="fld fld--checkbox">
            <span>Comfort</span>
            <label class="check">
              <input [(ngModel)]="model.isAC" name="isAC" type="checkbox" />
              <span>Air-conditioned room</span>
            </label>
            <small>Capacity: {{ capacityLabel(model.sharingType) }}</small>
          </label>
        </div>
      </section>

      <div class="note">
        <mat-icon>info</mat-icon>
        <span>{{ mode === 'create'
          ? 'Rooms created here are immediately available in Layout and tenant assignment flows.'
          : 'Status and capacity changes are validated against current occupancy before saving.' }}</span>
      </div>

      <div class="actions">
        <button class="btn btn--ghost" type="button" (click)="cancelled.emit()" [disabled]="saving">Cancel</button>
        <button class="btn btn--primary" type="submit" [disabled]="saving">
          <mat-icon>check</mat-icon>
          <span>{{ saving ? savingLabel() : submitLabel() }}</span>
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
    .fld { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .fld span { font-size: 11px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; }
    .fld small { color: var(--text-dim); font-size: 12px; }
    .fld em { color: #fca5a5; font-style: normal; font-size: 12px; }
    .fld--checkbox { justify-content: end; }
    .check {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text);
      font-size: 13px;
      text-transform: none;
      letter-spacing: 0;
    }
    .check input { width: 16px; height: 16px; accent-color: var(--primary); }
    input, select {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 10px;
      padding: 10px 12px;
      font-family: inherit;
    }
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
      .grid { grid-template-columns: 1fr; }
      .actions { flex-direction: column-reverse; }
      .actions button { width: 100%; justify-content: center; }
    }
  `]
})
export class PropertyRoomFormComponent {
  @Input() model: RoomFormValue = this.blankModel();
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() saving = false;
  @Input() errorMessage = '';
  @Output() submitted = new EventEmitter<RoomCreatePayload>();
  @Output() cancelled = new EventEmitter<void>();

  attempted = false;
  readonly sharingTypes: SharingType[] = ['SINGLE', 'DOUBLE', 'TRIPLE', 'DORM'];
  readonly cleaningStatuses: CleaningStatus[] = ['CLEAN', 'DIRTY', 'IN_PROGRESS'];
  readonly roomStatuses: RoomMutableStatus[] = ['VACANT', 'OCCUPIED', 'SUBLETTING', 'VACATING', 'MAINTENANCE'];

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

    const payload: RoomCreatePayload = {
      roomNumber: this.model.roomNumber.trim(),
      floor: Number(this.model.floor),
      isAC: !!this.model.isAC,
      sharingType: this.model.sharingType,
      monthlyRent: Number(this.model.monthlyRent),
      depositAmount: Number(this.model.depositAmount),
      status: this.model.status,
      cleaningStatus: this.model.cleaningStatus
    };
    this.submitted.emit(payload);
  }

  showError(control: NgModel | null): boolean {
    return !!control?.invalid && (this.attempted || !!control.touched);
  }

  submitLabel(): string {
    return this.mode === 'create' ? 'Add room' : 'Save room';
  }

  savingLabel(): string {
    return this.mode === 'create' ? 'Adding...' : 'Saving...';
  }

  capacityLabel(sharingType: SharingType): string {
    switch (sharingType) {
      case 'SINGLE': return '1 bed';
      case 'DOUBLE': return '2 beds';
      case 'TRIPLE': return '3 beds';
      case 'DORM': return '6 beds';
    }
  }

  private blankModel(): RoomFormValue {
    return {
      roomNumber: '',
      floor: 1,
      isAC: false,
      sharingType: 'DOUBLE',
      monthlyRent: 9000,
      depositAmount: 10000,
      status: 'VACANT',
      cleaningStatus: 'CLEAN'
    };
  }
}
