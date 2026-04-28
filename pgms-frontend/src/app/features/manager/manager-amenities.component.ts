import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { AmenityControl, AmenityType, PG } from '../../core/models';
import { PopupShellComponent } from '../../shared/popup-shell.component';

type AmenityForm = {
  id?: number;
  pgId: number;
  amenityType: AmenityType;
  displayName: string;
  resourceName: string;
  facilityName: string;
  unitCount: number;
  capacity: number;
  slotDurationMinutes: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
  maintenanceMode: boolean;
};

@Component({
  selector: 'app-manager-amenities',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PopupShellComponent],
  template: `
    <section class="manager-amenities fade-up">
      <header class="page-head">
        <div>
          <div class="eyebrow">Amenities</div>
          <h1>Resource Setup</h1>
          <p>Set up each amenity once with units, booking window, and slot duration. Tenants book against the generated slots automatically.</p>
        </div>
        <div class="head-actions">
          <button class="btn btn--ghost" type="button" (click)="load()">
            <mat-icon>refresh</mat-icon>
            <span>Refresh</span>
          </button>
          <button class="btn btn--primary" type="button" (click)="openCreate()">
            <mat-icon>add</mat-icon>
            <span>Add Amenity</span>
          </button>
        </div>
      </header>

      @if (loading()) {
        <div class="state surface">
          <div class="spinner"></div>
          <span>Loading amenities...</span>
        </div>
      } @else if (error()) {
        <div class="state surface state--error">
          <mat-icon>error</mat-icon>
          <span>{{ error() }}</span>
        </div>
      } @else {
        @if (!groupedControls().length) {
          <div class="state surface">
            <mat-icon>event_busy</mat-icon>
            <span>No amenities available for your assigned PGs yet.</span>
          </div>
        } @else {
          <div class="group-stack">
            @for (group of groupedControls(); track group.pgId) {
              <section class="surface group-card">
                <div class="group-head">
                  <div>
                    <h2>{{ group.pgName }}</h2>
                    <p>{{ group.items.length }} amenity {{ group.items.length === 1 ? 'resource' : 'resources' }}</p>
                  </div>
                </div>

                <div class="resource-list">
                  @for (control of group.items; track control.id) {
                    <article class="resource-row" [class.resource-row--muted]="!control.enabled" [class.resource-row--maintenance]="control.maintenanceMode">
                      <div class="resource-main">
                        <div class="resource-title-row">
                          <strong>{{ control.displayName }}</strong>
                          <span class="status-pill" [class.status-pill--warn]="control.maintenanceMode" [class.status-pill--muted]="!control.enabled">
                            {{ statusLabel(control) }}
                          </span>
                        </div>
                        <div class="resource-meta">
                          {{ control.unitCount }} {{ control.resourceName.toLowerCase() }}{{ control.unitCount === 1 ? '' : 's' }}
                          · {{ control.facilityName }}
                        </div>
                      </div>

                      <div class="resource-stats">
                        <div class="stat">
                          <span>Booking Window</span>
                          <strong>{{ timeLabel(control.startTime) }} - {{ timeLabel(control.endTime) }}</strong>
                        </div>
                        <div class="stat">
                          <span>Slot Size</span>
                          <strong>{{ control.slotDurationMinutes }} min</strong>
                        </div>
                        <div class="stat">
                          <span>Per Slot</span>
                          <strong>{{ slotCapacityLabel(control) }}</strong>
                        </div>
                        <div class="stat">
                          <span>Live</span>
                          <strong>{{ control.upcomingOpenSlots }} open · {{ control.upcomingBookedSlots }} booked</strong>
                        </div>
                      </div>

                      <div class="resource-actions">
                        <button class="icon-btn" type="button" (click)="openEdit(control)" title="Edit amenity">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button class="icon-btn" type="button" (click)="toggleEnabled(control)" [title]="control.enabled ? 'Disable amenity' : 'Enable amenity'">
                          <mat-icon>{{ control.enabled ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                        </button>
                        <button class="icon-btn" type="button" [disabled]="!control.enabled" (click)="toggleMaintenance(control)" title="Toggle maintenance">
                          <mat-icon>{{ control.maintenanceMode ? 'build_circle' : 'construction' }}</mat-icon>
                        </button>
                        <button class="icon-btn icon-btn--danger" type="button" (click)="deleteControl(control)" title="Delete amenity">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    </article>
                  }
                </div>
              </section>
            }
          </div>
        }
      }

      <app-popup-shell
        [open]="editorOpen()"
        eyebrow="Amenities"
        [title]="editorMode() === 'create' ? 'Add amenity' : 'Edit amenity'"
        subtitle="Managers set the resource, timing, and unit count here. Tenant slots follow automatically."
        (closed)="closeEditor()"
      >
        <div class="form-grid">
          <label class="fld">
            <span>PG</span>
            <select [(ngModel)]="form.pgId" name="amenityPgId">
              @for (pg of pgs(); track pg.id) {
                <option [ngValue]="pg.id">{{ pg.name }}</option>
              }
            </select>
          </label>

          <label class="fld">
            <span>Type</span>
            <select [(ngModel)]="form.amenityType" name="amenityType">
              @for (type of amenityTypes; track type) {
                <option [ngValue]="type">{{ pretty(type) }}</option>
              }
            </select>
          </label>

          <label class="fld">
            <span>Amenity name</span>
            <input [(ngModel)]="form.displayName" name="displayName" />
          </label>

          <label class="fld">
            <span>Unit label</span>
            <input [(ngModel)]="form.resourceName" name="resourceName" />
          </label>

          <label class="fld fld--wide">
            <span>Location</span>
            <input [(ngModel)]="form.facilityName" name="facilityName" />
          </label>

          <label class="fld">
            <span>Units</span>
            <input type="number" [(ngModel)]="form.unitCount" name="unitCount" />
          </label>

          <label class="fld">
            <span>Capacity Per Unit</span>
            <input type="number" min="1" [(ngModel)]="form.capacity" name="capacity" />
          </label>

          <label class="fld">
            <span>Slot Duration</span>
            <input type="number" min="15" step="15" [(ngModel)]="form.slotDurationMinutes" name="slotDurationMinutes" />
          </label>

          <label class="fld">
            <span>Starts At</span>
            <input type="time" [(ngModel)]="form.startTime" name="startTime" />
          </label>

          <label class="fld">
            <span>Ends At</span>
            <input type="time" [(ngModel)]="form.endTime" name="endTime" />
          </label>

          <label class="fld fld--check">
            <input type="checkbox" [(ngModel)]="form.enabled" name="enabled" />
            <span>Enabled</span>
          </label>

          <label class="fld fld--check">
            <input type="checkbox" [(ngModel)]="form.maintenanceMode" name="maintenanceMode" />
            <span>Maintenance mode</span>
          </label>
        </div>

        <div class="dialog-actions">
          <button class="btn btn--ghost" type="button" (click)="closeEditor()">Cancel</button>
          <button class="btn btn--primary" type="button" (click)="saveEditor()">
            <mat-icon>check</mat-icon>
            <span>{{ editorMode() === 'create' ? 'Create Amenity' : 'Save Changes' }}</span>
          </button>
        </div>
      </app-popup-shell>
    </section>
  `,
  styles: [`
    .manager-amenities { display: grid; gap: 18px; }
    .page-head, .group-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .eyebrow {
      font-size: 11px;
      color: var(--primary);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
    }
    h1, h2 { margin: 6px 0 2px; letter-spacing: 0; }
    h1 { font-size: 24px; }
    h2 { font-size: 18px; }
    p { margin: 0; color: var(--text-muted); font-size: 13px; line-height: 1.5; }
    .surface {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface);
      padding: 16px;
    }
    .head-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .group-stack { display: grid; gap: 16px; }
    .resource-list { display: grid; gap: 10px; margin-top: 6px; }
    .resource-row {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) minmax(320px, 1.2fr) auto;
      gap: 14px;
      padding: 14px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--bg);
      align-items: center;
    }
    .resource-row--muted { opacity: 0.78; }
    .resource-row--maintenance { border-color: rgba(251,191,36,0.28); }
    .resource-main, .resource-stats { min-width: 0; }
    .resource-title-row {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .resource-meta { color: var(--text-muted); font-size: 12px; margin-top: 4px; }
    .resource-stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .stat {
      display: grid;
      gap: 3px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.04);
      background: rgba(255,255,255,0.02);
    }
    .stat span {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .stat strong { font-size: 13px; }
    .resource-actions { display: flex; gap: 8px; align-items: center; }
    .status-pill {
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(34,197,94,0.14);
      color: #86efac;
      font-size: 11px;
      font-weight: 700;
    }
    .status-pill--warn { background: rgba(251,191,36,0.16); color: #fde68a; }
    .status-pill--muted { background: rgba(148,163,184,0.16); color: #cbd5e1; }
    .btn, .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--bg-elev);
      color: var(--text);
      cursor: pointer;
      font-weight: 600;
    }
    .btn { height: 38px; padding: 0 14px; }
    .btn--primary { background: rgba(96,165,250,0.14); border-color: rgba(96,165,250,0.42); color: #bfdbfe; }
    .btn--ghost { color: var(--text-muted); }
    .icon-btn {
      width: 38px;
      height: 38px;
      padding: 0;
      color: var(--text-muted);
    }
    .icon-btn--danger { color: #fca5a5; border-color: rgba(248,113,113,0.2); }
    .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .state {
      min-height: 180px;
      display: grid;
      place-items: center;
      gap: 10px;
      text-align: center;
      color: var(--text-muted);
    }
    .state--error { color: var(--danger); }
    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .fld {
      display: grid;
      gap: 6px;
    }
    .fld--wide { grid-column: span 2; }
    .fld span {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .fld input, .fld select {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 10px;
      padding: 10px 12px;
      font-family: inherit;
    }
    .fld--check {
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 10px;
    }
    .fld--check span {
      font-size: 13px;
      color: var(--text);
      text-transform: none;
      letter-spacing: 0;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 1120px) {
      .resource-row {
        grid-template-columns: 1fr;
      }
      .resource-actions {
        justify-content: flex-start;
      }
    }
    @media (max-width: 760px) {
      .resource-stats,
      .form-grid {
        grid-template-columns: 1fr;
      }
      .fld--wide {
        grid-column: span 1;
      }
    }
  `]
})
export class ManagerAmenitiesComponent {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  readonly amenityTypes: AmenityType[] = ['WASHING_MACHINE', 'TABLE_TENNIS', 'CARROM', 'BADMINTON', 'CUSTOM'];

  pgs = signal<PG[]>([]);
  controls = signal<AmenityControl[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  editorOpen = signal(false);
  editorMode = signal<'create' | 'edit'>('create');

  form: AmenityForm = this.emptyForm();

  groupedControls = computed(() => {
    const groups = new Map<number, AmenityControl[]>();
    for (const control of this.controls()) {
      if (!groups.has(control.pgId)) groups.set(control.pgId, []);
      groups.get(control.pgId)!.push(control);
    }
    return [...groups.entries()].map(([pgId, items]) => ({
      pgId,
      pgName: this.pgs().find(pg => pg.id === pgId)?.name || `PG ${pgId}`,
      items: items.sort((a, b) => a.displayName.localeCompare(b.displayName))
    }));
  });

  constructor() {
    this.api.listPgs().subscribe({ next: value => { this.pgs.set(value); if (!this.form.pgId && value[0]) this.form.pgId = value[0].id; } });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.listAmenityControls().subscribe({
      next: value => {
        this.controls.set(value.map(control => this.normalizeControl(control)));
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.message || 'Could not load amenities');
        this.loading.set(false);
      }
    });
  }

  openCreate() {
    this.editorMode.set('create');
    this.form = this.emptyForm();
    this.form.pgId = this.pgs()[0]?.id || 0;
    this.editorOpen.set(true);
  }

  openEdit(control: AmenityControl) {
    const normalized = this.normalizeControl(control);
    this.editorMode.set('edit');
    this.form = {
      id: normalized.id,
      pgId: normalized.pgId,
      amenityType: normalized.amenityType,
      displayName: normalized.displayName,
      resourceName: normalized.resourceName,
      facilityName: normalized.facilityName,
      unitCount: normalized.unitCount,
      capacity: normalized.capacity,
      slotDurationMinutes: normalized.slotDurationMinutes,
      startTime: normalized.startTime,
      endTime: normalized.endTime,
      enabled: normalized.enabled,
      maintenanceMode: normalized.maintenanceMode
    };
    this.editorOpen.set(true);
  }

  closeEditor() {
    this.editorOpen.set(false);
  }

  saveEditor() {
    this.sanitizeForm();
    const error = this.validateForm();
    if (error) {
      this.snack.open(error, 'Dismiss', { duration: 2800, panelClass: 'pgms-snack' });
      return;
    }
    const payload = {
      pgId: this.form.pgId,
      amenityType: this.form.amenityType,
      displayName: this.form.displayName.trim(),
      resourceName: this.form.resourceName.trim(),
      facilityName: this.form.facilityName.trim(),
      unitCount: Number(this.form.unitCount),
      capacity: Number(this.form.capacity),
      slotDurationMinutes: Number(this.form.slotDurationMinutes),
      startTime: this.form.startTime,
      endTime: this.form.endTime,
      enabled: !!this.form.enabled,
      maintenanceMode: !!this.form.maintenanceMode
    };
    const request = this.editorMode() === 'create'
      ? this.api.createAmenityControl(payload)
      : this.api.saveAmenityControl(Number(this.form.id), payload);
    request.subscribe({
      next: () => {
        this.snack.open(this.editorMode() === 'create' ? 'Amenity added' : 'Amenity updated', 'OK', { duration: 2000, panelClass: 'pgms-snack' });
        this.editorOpen.set(false);
        this.load();
      },
      error: err => this.snack.open(err?.message || 'Could not save amenity', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' })
    });
  }

  toggleEnabled(control: AmenityControl) {
    const normalized = this.normalizeControl(control);
    this.api.saveAmenityControl(normalized.id, { ...normalized, enabled: !normalized.enabled, maintenanceMode: normalized.enabled ? false : normalized.maintenanceMode }).subscribe({
      next: () => this.load(),
      error: err => this.snack.open(err?.message || 'Could not update amenity', 'Dismiss', { duration: 2800, panelClass: 'pgms-snack' })
    });
  }

  toggleMaintenance(control: AmenityControl) {
    if (!control.enabled) return;
    const normalized = this.normalizeControl(control);
    this.api.saveAmenityControl(normalized.id, { ...normalized, maintenanceMode: !normalized.maintenanceMode }).subscribe({
      next: () => this.load(),
      error: err => this.snack.open(err?.message || 'Could not update amenity', 'Dismiss', { duration: 2800, panelClass: 'pgms-snack' })
    });
  }

  deleteControl(control: AmenityControl) {
    this.api.deleteAmenityControl(control.id).subscribe({
      next: () => {
        this.snack.open('Amenity deleted', 'OK', { duration: 1800, panelClass: 'pgms-snack' });
        this.load();
      },
      error: err => this.snack.open(err?.message || 'Could not delete amenity', 'Dismiss', { duration: 3200, panelClass: 'pgms-snack' })
    });
  }

  statusLabel(control: AmenityControl): string {
    if (!control.enabled) return 'Disabled';
    if (control.maintenanceMode) return 'Maintenance';
    return 'Live';
  }

  slotCapacityLabel(control: AmenityControl): string {
    if (control.amenityType === 'WASHING_MACHINE') return '1 booking';
    return `${control.capacity} ${control.capacity === 1 ? 'person' : 'people'}`;
  }

  timeLabel(value: string): string {
    const [hours, minutes] = String(value || '').split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const normalizedHours = hours % 12 || 12;
    return `${normalizedHours}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  pretty(value: string): string {
    return value.toLowerCase().split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  private validateForm(): string | null {
    if (!this.form.pgId) return 'Choose a PG.';
    if (!this.form.displayName.trim()) return 'Enter an amenity name.';
    if (!this.form.resourceName.trim()) return 'Enter a unit label.';
    if (!this.form.facilityName.trim()) return 'Enter a location.';
    if (Number(this.form.capacity) < 1) return 'Capacity per unit must be at least 1.';
    if (Number(this.form.slotDurationMinutes) < 15) return 'Slot duration must be at least 15 minutes.';
    if (!this.form.startTime || !this.form.endTime) return 'Choose both start and end time.';
    if (this.form.endTime <= this.form.startTime) return 'End time must be after start time.';
    return null;
  }

  private emptyForm(): AmenityForm {
    return {
      pgId: 0,
      amenityType: 'WASHING_MACHINE',
      displayName: 'Washing Machine',
      resourceName: 'Machine',
      facilityName: 'Laundry Room',
      unitCount: 2,
      capacity: 1,
      slotDurationMinutes: 30,
      startTime: '07:00',
      endTime: '22:00',
      enabled: true,
      maintenanceMode: false
    };
  }

  private normalizeControl(control: AmenityControl): AmenityControl {
    const isWashingMachine = control.amenityType === 'WASHING_MACHINE';
    return {
      ...control,
      displayName: control.displayName?.trim() || this.defaultDisplayName(control.amenityType),
      resourceName: control.resourceName?.trim() || this.defaultResourceName(control.amenityType),
      facilityName: control.facilityName?.trim() || this.defaultFacilityName(control.amenityType),
      unitCount: Math.max(1, Number(control.unitCount || (isWashingMachine ? 2 : 1))),
      capacity: isWashingMachine ? 1 : Math.max(1, Number(control.capacity || 1)),
      slotDurationMinutes: Math.max(15, Number(control.slotDurationMinutes || (isWashingMachine ? 30 : 60))),
      startTime: control.startTime || (isWashingMachine ? '07:00' : '18:00'),
      endTime: control.endTime || '22:00',
      enabled: !!control.enabled,
      maintenanceMode: !!control.maintenanceMode,
      upcomingOpenSlots: Math.max(0, Number(control.upcomingOpenSlots || 0)),
      upcomingBookedSlots: Math.max(0, Number(control.upcomingBookedSlots || 0))
    };
  }

  private sanitizeForm() {
    const isWashingMachine = this.form.amenityType === 'WASHING_MACHINE';
    this.form.displayName = this.form.displayName?.trim() || this.defaultDisplayName(this.form.amenityType);
    this.form.resourceName = this.form.resourceName?.trim() || this.defaultResourceName(this.form.amenityType);
    this.form.facilityName = this.form.facilityName?.trim() || this.defaultFacilityName(this.form.amenityType);
    this.form.unitCount = Math.max(1, Number(this.form.unitCount || (isWashingMachine ? 2 : 1)));
    this.form.capacity = isWashingMachine ? 1 : Math.max(1, Number(this.form.capacity || 1));
    this.form.slotDurationMinutes = Math.max(15, Number(this.form.slotDurationMinutes || (isWashingMachine ? 30 : 60)));
    this.form.startTime = this.form.startTime || (isWashingMachine ? '07:00' : '18:00');
    this.form.endTime = this.form.endTime || '22:00';
  }

  private defaultDisplayName(type: AmenityType): string {
    switch (type) {
      case 'WASHING_MACHINE': return 'Washing Machine';
      case 'TABLE_TENNIS': return 'Table Tennis';
      case 'CARROM': return 'Carrom';
      case 'BADMINTON': return 'Badminton';
      case 'CUSTOM': return 'Custom Amenity';
    }
  }

  private defaultResourceName(type: AmenityType): string {
    switch (type) {
      case 'WASHING_MACHINE': return 'Machine';
      case 'TABLE_TENNIS': return 'Table';
      case 'CARROM': return 'Board';
      case 'BADMINTON': return 'Court';
      case 'CUSTOM': return 'Unit';
    }
  }

  private defaultFacilityName(type: AmenityType): string {
    switch (type) {
      case 'WASHING_MACHINE': return 'Laundry Room';
      case 'TABLE_TENNIS': return 'Common Lounge';
      case 'CARROM': return 'Rec Room';
      case 'BADMINTON': return 'Badminton Court';
      case 'CUSTOM': return 'Common Area';
    }
  }
}
