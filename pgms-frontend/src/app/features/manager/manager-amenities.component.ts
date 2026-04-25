import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { AmenityBooking, AmenityType, PG } from '../../core/models';
import { PopupShellComponent } from '../../shared/popup-shell.component';

type AmenityForm = {
  pgId: number | '';
  amenityType: AmenityType;
  resourceName: string;
  facilityName: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
};

@Component({
  selector: 'app-manager-amenities',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PopupShellComponent],
  template: `
    <section class="manager-amenities fade-up">
      <section class="setup surface">
        <div class="section-head">
          <div>
            <div class="eyebrow">Resource Setup</div>
            <h2>Publish amenity availability</h2>
            <p>Create machine windows or shared-session slots for your assigned PGs.</p>
          </div>
          <button class="btn btn--ghost" type="button" (click)="load()">
            <mat-icon>refresh</mat-icon>
            <span>Refresh</span>
          </button>
        </div>

        <div class="summary-grid">
          <article class="summary-card">
            <span class="summary-label">Upcoming slots</span>
            <strong class="summary-value">{{ slots().length }}</strong>
            <small class="summary-meta">Published across your PGs</small>
          </article>
          <article class="summary-card">
            <span class="summary-label">Booked units</span>
            <strong class="summary-value">{{ bookedSlotsCount() }}</strong>
            <small class="summary-meta">Cannot be edited or deleted</small>
          </article>
          <article class="summary-card">
            <span class="summary-label">Machines</span>
            <strong class="summary-value">{{ machineSlotsCount() }}</strong>
            <small class="summary-meta">Individual washing-machine units</small>
          </article>
          <article class="summary-card">
            <span class="summary-label">Shared sessions</span>
            <strong class="summary-value">{{ sharedSlotsCount() }}</strong>
            <small class="summary-meta">Games and joinable sessions</small>
          </article>
        </div>

        <form class="form-grid" (ngSubmit)="createSlot()">
          <label class="fld">
            <span>PG</span>
            <select [(ngModel)]="form.pgId" name="pgId" required>
              @for (pg of pgs(); track pg.id) {
                <option [ngValue]="pg.id">{{ pg.name }}</option>
              }
            </select>
          </label>

          <label class="fld">
            <span>Amenity</span>
            <select [(ngModel)]="form.amenityType" name="amenityType" required>
              @for (type of amenityTypes; track type) {
                <option [value]="type">{{ pretty(type) }}</option>
              }
            </select>
          </label>

          <label class="fld">
            <span>{{ resourceLabel() }}</span>
            <input [(ngModel)]="form.resourceName" name="resourceName" [placeholder]="resourcePlaceholder()" />
          </label>

          <label class="fld">
            <span>Location</span>
            <input [(ngModel)]="form.facilityName" name="facilityName" [placeholder]="locationPlaceholder()" />
          </label>

          <label class="fld">
            <span>Date</span>
            <input type="date" [(ngModel)]="form.slotDate" name="slotDate" required />
          </label>

          <label class="fld">
            <span>Start</span>
            <input type="time" [(ngModel)]="form.startTime" name="startTime" required />
          </label>

          <label class="fld">
            <span>End</span>
            <input type="time" [(ngModel)]="form.endTime" name="endTime" required />
          </label>

          <label class="fld">
            <span>{{ capacityLabel() }}</span>
            <input type="number" min="1" [(ngModel)]="form.capacity" name="capacity" required />
          </label>

          <div class="form-foot">
            <div class="hint">
              @if (isMachineMode()) {
                Each unit becomes its own machine booking for every 30-minute slot.
              } @else {
                Shared amenities use one slot with player capacity and optional host/join flow.
              }
            </div>
            <button class="btn btn--primary" type="submit" [disabled]="saving()">
              <mat-icon>add</mat-icon>
              <span>{{ saving() ? 'Saving...' : 'Create availability' }}</span>
            </button>
          </div>
        </form>
      </section>

      @if (loading()) {
        <div class="state surface">
          <div class="spinner"></div>
          <span>Loading amenity schedule...</span>
        </div>
      } @else if (error()) {
        <div class="state surface err">
          <mat-icon>error</mat-icon>
          <span>{{ error() }}</span>
        </div>
      } @else if (!slots().length) {
        <div class="state surface">
          <mat-icon>event_busy</mat-icon>
          <span>No amenity schedule has been published yet.</span>
        </div>
      } @else {
        <section class="schedule surface">
          <div class="section-head">
            <div>
              <div class="eyebrow">Schedule</div>
              <h2>Upcoming slot inventory</h2>
              <p>Review every upcoming unit, see who has booked it, and adjust free slots.</p>
            </div>
          </div>

          <div class="day-stack">
            @for (group of groupedSlots(); track group.date) {
              <section class="day-block">
                <div class="day-head">
                  <div>
                    <div class="day-name">{{ group.date | date:'EEEE' }}</div>
                    <div class="day-date">{{ group.date | date:'mediumDate' }}</div>
                  </div>
                  <div class="day-count">{{ group.items.length }} slot{{ group.items.length === 1 ? '' : 's' }}</div>
                </div>

                <div class="slot-list">
                  @for (slot of group.items; track slot.slotId) {
                    <article class="slot-card" [class.slot-card--locked]="isLocked(slot)" [class.slot-card--machine]="slot.amenityType === 'WASHING_MACHINE'">
                      <div class="slot-top">
                        <div class="slot-title">
                          <strong>{{ slot.resourceName || pretty(slot.amenityType) }}</strong>
                          <div class="slot-sub">{{ pretty(slot.amenityType) }} · {{ pgName(slot.pgId) }} · {{ slot.facilityName || 'Common area' }}</div>
                        </div>
                        <span class="slot-status" [class.slot-status--booked]="isLocked(slot)">
                          {{ isLocked(slot) ? 'Booked' : 'Open' }}
                        </span>
                      </div>

                      <div class="slot-time">{{ slot.startTime }} - {{ slot.endTime }}</div>

                      <div class="slot-meta">
                        <div class="meta-chip">
                          <span>{{ slot.amenityType === 'WASHING_MACHINE' ? 'Unit' : 'Capacity' }}</span>
                          <strong>{{ slot.capacity }}</strong>
                        </div>
                        <div class="meta-chip">
                          <span>Booked</span>
                          <strong>{{ slot.bookingCount || 0 }}</strong>
                        </div>
                        @if (slot.hostName) {
                          <div class="meta-chip">
                            <span>Host</span>
                            <strong>{{ slot.hostName }}</strong>
                          </div>
                        } @else if (slot.tenantName) {
                          <div class="meta-chip">
                            <span>Booked by</span>
                            <strong>{{ slot.tenantName }}</strong>
                          </div>
                        }
                      </div>

                      <div class="slot-actions">
                        <button class="btn btn--ghost" type="button" (click)="openEdit(slot)" [disabled]="isLocked(slot)">
                          <mat-icon>edit</mat-icon>
                          <span>Edit</span>
                        </button>
                        <button class="btn btn--danger" type="button" (click)="deleteSlot(slot)" [disabled]="isLocked(slot)">
                          <mat-icon>delete</mat-icon>
                          <span>Delete</span>
                        </button>
                      </div>
                    </article>
                  }
                </div>
              </section>
            }
          </div>
        </section>
      }
    </section>

    <app-popup-shell
      [open]="editOpen()"
      eyebrow="Amenities"
      title="Edit slot"
      subtitle="Only unbooked future slots can be edited."
      (closed)="closeEdit()"
    >
      <form class="form-grid" (ngSubmit)="saveEdit()">
        <label class="fld">
          <span>PG</span>
          <select [(ngModel)]="editForm.pgId" name="editPgId" required>
            @for (pg of pgs(); track pg.id) {
              <option [ngValue]="pg.id">{{ pg.name }}</option>
            }
          </select>
        </label>

        <label class="fld">
          <span>Amenity</span>
          <select [(ngModel)]="editForm.amenityType" name="editAmenityType" required>
            @for (type of amenityTypes; track type) {
              <option [value]="type">{{ pretty(type) }}</option>
            }
          </select>
        </label>

        <label class="fld">
          <span>Resource label</span>
          <input [(ngModel)]="editForm.resourceName" name="editResourceName" />
        </label>

        <label class="fld">
          <span>Location</span>
          <input [(ngModel)]="editForm.facilityName" name="editFacilityName" />
        </label>

        <label class="fld">
          <span>Date</span>
          <input type="date" [(ngModel)]="editForm.slotDate" name="editSlotDate" required />
        </label>

        <label class="fld">
          <span>Start</span>
          <input type="time" [(ngModel)]="editForm.startTime" name="editStartTime" required />
        </label>

        <label class="fld">
          <span>End</span>
          <input type="time" [(ngModel)]="editForm.endTime" name="editEndTime" required />
        </label>

        <label class="fld">
          <span>{{ editForm.amenityType === 'WASHING_MACHINE' ? 'Unit capacity' : 'Seats / players' }}</span>
          <input type="number" min="1" [(ngModel)]="editForm.capacity" name="editCapacity" required />
        </label>

        <div class="dialog-actions">
          <button class="btn btn--ghost" type="button" (click)="closeEdit()">Cancel</button>
          <button class="btn btn--primary" type="submit" [disabled]="saving()">
            <mat-icon>check</mat-icon>
            <span>{{ saving() ? 'Saving...' : 'Save changes' }}</span>
          </button>
        </div>
      </form>
    </app-popup-shell>
  `,
  styles: [`
    .manager-amenities { display: flex; flex-direction: column; gap: 18px; }
    .surface {
      border: 1px solid var(--border);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.012));
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      flex-wrap: wrap;
    }
    .eyebrow { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h2 { margin: 6px 0 2px; font-size: 24px; letter-spacing: -0.02em; }
    p { margin: 0; color: var(--text-muted); font-size: 13px; line-height: 1.5; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .summary-card, .meta-chip {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: rgba(255,255,255,0.03);
    }
    .summary-card { padding: 14px; display: grid; gap: 6px; }
    .summary-label { font-size: 11px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; }
    .summary-value { font-size: 28px; font-weight: 800; font-family: var(--font-mono); letter-spacing: -0.03em; }
    .summary-meta { color: var(--text-muted); font-size: 12px; }
    .form-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .fld { display: flex; flex-direction: column; gap: 8px; }
    .fld span { color: var(--text-muted); font-size: 12px; font-weight: 600; }
    .fld input, .fld select {
      width: 100%;
      background: var(--bg-elev);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 12px;
      padding: 12px 14px;
      font-family: inherit;
    }
    .form-foot {
      grid-column: 1 / -1;
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 4px;
    }
    .hint { color: var(--text-muted); font-size: 12px; max-width: 560px; line-height: 1.45; }
    .day-stack { display: flex; flex-direction: column; gap: 16px; }
    .day-block { display: flex; flex-direction: column; gap: 12px; }
    .day-head { display: flex; justify-content: space-between; gap: 12px; align-items: end; }
    .day-name { font-size: 18px; font-weight: 700; }
    .day-date, .day-count { color: var(--text-muted); font-size: 12px; }
    .slot-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .slot-card {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: rgba(255,255,255,0.025);
      padding: 14px;
      display: grid;
      gap: 12px;
    }
    .slot-card--locked { border-color: rgba(251,191,36,0.34); background: rgba(251,191,36,0.07); }
    .slot-card--machine { background: linear-gradient(180deg, rgba(96,165,250,0.07), rgba(255,255,255,0.02)); }
    .slot-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .slot-title { display: grid; gap: 4px; }
    .slot-sub { color: var(--text-muted); font-size: 12px; line-height: 1.4; }
    .slot-status {
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(34,197,94,0.12);
      color: #86efac;
      white-space: nowrap;
    }
    .slot-status--booked { background: rgba(251,191,36,0.16); color: #fde68a; }
    .slot-time { font-family: var(--font-mono); font-size: 24px; font-weight: 800; letter-spacing: -0.03em; }
    .slot-meta { display: flex; gap: 8px; flex-wrap: wrap; }
    .meta-chip { padding: 10px 12px; display: grid; gap: 4px; min-width: 110px; }
    .meta-chip span { font-size: 11px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; }
    .meta-chip strong { font-size: 13px; }
    .slot-actions, .dialog-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: 12px;
      border: 1px solid var(--border);
      height: 38px;
      padding: 0 14px;
      background: var(--bg-elev);
      color: var(--text);
      cursor: pointer;
      font-weight: 600;
    }
    .btn--primary { background: rgba(96,165,250,0.14); border-color: rgba(96,165,250,0.42); color: #bfdbfe; }
    .btn--ghost { color: var(--text-muted); }
    .btn--danger { background: rgba(248,113,113,0.14); border-color: rgba(248,113,113,0.34); color: #fca5a5; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .state { min-height: 180px; display: grid; place-items: center; gap: 10px; color: var(--text-muted); text-align: center; }
    .state.err { color: var(--danger); }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.9s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 1180px) {
      .summary-grid, .form-grid, .slot-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .summary-grid, .form-grid, .slot-list { grid-template-columns: 1fr; }
      .form-foot { align-items: stretch; }
    }
  `]
})
export class ManagerAmenitiesComponent {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  amenityTypes: AmenityType[] = ['WASHING_MACHINE', 'TABLE_TENNIS', 'CARROM', 'BADMINTON'];
  pgs = signal<PG[]>([]);
  slots = signal<AmenityBooking[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  editOpen = signal(false);
  editingSlotId = signal<number | null>(null);

  form: AmenityForm = this.defaultForm();
  editForm: AmenityForm = this.defaultForm();

  bookedSlotsCount = computed(() => this.slots().filter(slot => Number(slot.bookingCount || 0) > 0).length);
  machineSlotsCount = computed(() => this.slots().filter(slot => slot.amenityType === 'WASHING_MACHINE').length);
  sharedSlotsCount = computed(() => this.slots().filter(slot => slot.amenityType !== 'WASHING_MACHINE').length);
  isMachineMode = computed(() => this.form.amenityType === 'WASHING_MACHINE');
  groupedSlots = computed(() => {
    const groups = new Map<string, AmenityBooking[]>();
    for (const slot of this.slots()) {
      const key = slot.slotDate || 'unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(slot);
    }
    return [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) =>
          `${a.startTime}-${a.facilityName || ''}-${a.resourceName || ''}`.localeCompare(`${b.startTime}-${b.facilityName || ''}-${b.resourceName || ''}`)
        )
      }));
  });

  constructor() {
    this.api.listPgs().subscribe({ next: pgs => {
      this.pgs.set(pgs);
      if (!this.form.pgId && pgs.length) this.form.pgId = pgs[0].id;
      if (!this.editForm.pgId && pgs.length) this.editForm.pgId = pgs[0].id;
    }});
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.listAmenities().subscribe({
      next: slots => {
        this.slots.set(slots);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.message || 'Could not load amenity schedule');
        this.loading.set(false);
      }
    });
  }

  createSlot() {
    if (!this.form.pgId) {
      this.snack.open('Pick a PG first.', 'Dismiss', { duration: 2200, panelClass: 'pgms-snack' });
      return;
    }
    this.saving.set(true);
    this.api.createAmenitySlot(this.payloadFromForm(this.form)).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Amenity availability created', 'OK', { duration: 2000, panelClass: 'pgms-snack' });
        this.form = this.defaultForm();
        if (this.pgs().length) this.form.pgId = this.pgs()[0].id;
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.snack.open(err?.message || 'Could not create amenity availability', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' });
      }
    });
  }

  openEdit(slot: AmenityBooking) {
    if (this.isLocked(slot)) return;
    this.editingSlotId.set(slot.slotId);
    this.editForm = {
      pgId: slot.pgId || this.pgs()[0]?.id || '',
      amenityType: slot.amenityType,
      resourceName: slot.resourceName || this.defaultResourceName(slot.amenityType),
      facilityName: slot.facilityName || '',
      slotDate: slot.slotDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity || 1
    };
    this.editOpen.set(true);
  }

  closeEdit() {
    this.editOpen.set(false);
    this.editingSlotId.set(null);
    this.editForm = this.defaultForm();
  }

  saveEdit() {
    const slotId = this.editingSlotId();
    if (!slotId || !this.editForm.pgId) return;
    this.saving.set(true);
    this.api.updateAmenitySlot(slotId, this.payloadFromForm(this.editForm)).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeEdit();
        this.snack.open('Amenity slot updated', 'OK', { duration: 2000, panelClass: 'pgms-snack' });
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.snack.open(err?.message || 'Could not update slot', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' });
      }
    });
  }

  deleteSlot(slot: AmenityBooking) {
    if (this.isLocked(slot)) return;
    this.api.deleteAmenitySlot(slot.slotId).subscribe({
      next: () => {
        this.snack.open('Amenity slot deleted', 'OK', { duration: 1800, panelClass: 'pgms-snack' });
        this.load();
      },
      error: err => {
        this.snack.open(err?.message || 'Could not delete slot', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' });
      }
    });
  }

  resourceLabel(): string {
    return this.isMachineMode() ? 'Base resource label' : 'Resource label';
  }

  resourcePlaceholder(): string {
    return this.isMachineMode() ? 'Machine' : this.defaultResourceName(this.form.amenityType);
  }

  locationPlaceholder(): string {
    return this.isMachineMode() ? 'Laundry Room' : 'Common Area';
  }

  capacityLabel(): string {
    return this.isMachineMode() ? 'Number of machines' : 'Seats / players';
  }

  isLocked(slot: AmenityBooking): boolean {
    return Number(slot.bookingCount || 0) > 0;
  }

  pgName(pgId?: number): string {
    return this.pgs().find(pg => pg.id === pgId)?.name || 'Assigned PG';
  }

  pretty(value: string): string {
    return value.toLowerCase().split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  private payloadFromForm(form: AmenityForm) {
    return {
      pgId: Number(form.pgId),
      amenityType: form.amenityType,
      resourceName: form.resourceName?.trim() || undefined,
      facilityName: form.facilityName?.trim() || undefined,
      slotDate: form.slotDate,
      startTime: form.startTime,
      endTime: form.endTime,
      capacity: Math.max(1, Number(form.capacity || 1))
    };
  }

  private defaultForm(): AmenityForm {
    return {
      pgId: '',
      amenityType: 'WASHING_MACHINE',
      resourceName: 'Machine',
      facilityName: 'Laundry Room',
      slotDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      startTime: '07:00',
      endTime: '08:00',
      capacity: 1
    };
  }

  private defaultResourceName(type: AmenityType): string {
    switch (type) {
      case 'WASHING_MACHINE': return 'Machine';
      case 'TABLE_TENNIS': return 'Table';
      case 'CARROM': return 'Board';
      case 'BADMINTON': return 'Court';
    }
  }
}
