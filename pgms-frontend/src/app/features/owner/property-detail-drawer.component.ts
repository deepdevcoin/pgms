import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { PG, PgCreatePayload, Room, RoomCreatePayload } from '../../core/models';
import { PopupShellComponent } from '../../shared/popup-shell.component';
import { PropertyFormComponent } from './property-form.component';
import { PropertyRoomFormComponent } from './property-room-form.component';

@Component({
  selector: 'app-property-detail-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, PopupShellComponent, PropertyFormComponent, PropertyRoomFormComponent],
  template: `
    @if (property) {
      <div class="backdrop" (click)="closed.emit()"></div>
      <aside class="drawer fade-up" data-testid="property-detail-drawer">
        <header class="head">
          <div>
            <div class="eyebrow">Property manager</div>
            <h2>{{ property.name }}</h2>
            <p class="sub">{{ property.address }}</p>
          </div>
          <div class="head-actions">
            <a class="btn btn--ghost" [routerLink]="['/owner/layout', property.id]">
              <mat-icon>grid_view</mat-icon>
              <span>Open layout</span>
            </a>
            <button class="icon-btn" type="button" (click)="closed.emit()" aria-label="Close">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </header>

        <div class="stats">
          <article class="stat">
            <span>Total rooms</span>
            <strong>{{ rooms().length }}</strong>
          </article>
          <article class="stat">
            <span>Vacancies</span>
            <strong class="stat--vacant">{{ property.vacantCount }}</strong>
          </article>
          <article class="stat">
            <span>Occupied</span>
            <strong>{{ occupiedRooms() }}</strong>
          </article>
          <article class="stat">
            <span>Avg. monthly rent</span>
            <strong>₹{{ averageRent() | number:'1.0-0' }}</strong>
          </article>
        </div>

        <section class="panel">
          <div class="panel-head">
            <div>
              <div class="mini-eyebrow">Settings</div>
              <h3>Property details</h3>
              <p>Adjust how this property appears in billing, service, and layout workflows.</p>
            </div>
          </div>

          <app-property-form
            [model]="propertyDraft"
            [saving]="savingProperty()"
            [errorMessage]="propertyError()"
            [submitLabel]="'Save changes'"
            [savingLabel]="'Saving...'"
            [noteText]="'Property defaults update immediately for future operations and onboarding.'"
            [showCancel]="false"
            (submitted)="saveProperty($event)"
          />
        </section>

        <section class="panel">
          <div class="panel-head panel-head--rooms">
            <div>
              <div class="mini-eyebrow">Inventory</div>
              <h3>Rooms and pricing</h3>
              <p>Track room setup, pricing, deposits, and readiness from one place.</p>
            </div>
            <button class="btn btn--primary" type="button" (click)="openRoomEditor()">
              <mat-icon>add</mat-icon>
              <span>Add room</span>
            </button>
          </div>

          <div class="room-toolbar">
            <label class="search">
              <mat-icon>search</mat-icon>
              <input
                [ngModel]="roomQuery()"
                (ngModelChange)="roomQuery.set($event)"
                name="roomQuery"
                type="text"
                placeholder="Search by room number"
              />
            </label>

            <label class="filter">
              <span>Floor</span>
              <select [ngModel]="floorFilter()" (ngModelChange)="setFloorFilter($event)" name="roomFloorFilter">
                <option [ngValue]="'ALL'">All floors</option>
                @for (floor of floors(); track floor) {
                  <option [ngValue]="floor">Floor {{ floor }}</option>
                }
              </select>
            </label>
          </div>

          @if (loadingRooms()) {
            <div class="state">
              <mat-icon>hourglass_top</mat-icon>
              <p>Loading rooms…</p>
            </div>
          } @else if (!filteredRooms().length) {
            <div class="state state--empty">
              <mat-icon>{{ rooms().length ? 'search_off' : 'meeting_room' }}</mat-icon>
              <p>{{ rooms().length ? 'No rooms match the current filter.' : 'No rooms added for this property yet.' }}</p>
            </div>
          } @else {
            <div class="room-list">
              @for (room of filteredRooms(); track room.id) {
                <article class="room-row">
                  <div class="room-main">
                    <div class="room-title">
                      <strong>{{ room.roomNumber }}</strong>
                      <span class="pill dot" [ngClass]="statusClass(room.status)">{{ room.status }}</span>
                    </div>
                    <div class="room-meta">
                      Floor {{ room.floor }} · {{ room.sharingType }} · {{ room.isAC ? 'AC' : 'Non-AC' }} · {{ room.cleaningStatus || 'CLEAN' }}
                    </div>
                  </div>
                  <div class="room-metrics">
                    <div class="metric">
                      <span>Rent</span>
                      <strong>₹{{ room.monthlyRent | number:'1.0-0' }}</strong>
                    </div>
                    <div class="metric">
                      <span>Deposit</span>
                      <strong>₹{{ (room.depositAmount || 0) | number:'1.0-0' }}</strong>
                    </div>
                    <div class="metric">
                      <span>Occupancy</span>
                      <strong>{{ room.occupants?.length || 0 }}/{{ room.capacity || capacityFor(room.sharingType) }}</strong>
                    </div>
                    <button class="mini" type="button" (click)="openRoomEditor(room)">
                      <mat-icon>edit</mat-icon>
                      <span>Edit</span>
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        </section>
      </aside>

      <app-popup-shell
        [open]="roomEditorOpen()"
        eyebrow="Rooms"
        [title]="editingRoom() ? 'Edit room' : 'Add room'"
        subtitle="Keep room details, pricing, and readiness aligned with the rest of the property."
        (closed)="closeRoomEditor()"
      >
        <app-property-room-form
          [model]="roomDraft"
          [mode]="editingRoom() ? 'edit' : 'create'"
          [saving]="savingRoom()"
          [errorMessage]="roomError()"
          (submitted)="saveRoom($event)"
          (cancelled)="closeRoomEditor()"
        />
      </app-popup-shell>
    }
  `,
  styles: [`
    .backdrop { position: fixed; inset: 0; background: rgba(3,6,15,0.58); z-index: 60; }
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(760px, 100vw);
      border-left: 1px solid var(--border);
      background: var(--surface);
      z-index: 61;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
    .eyebrow, .mini-eyebrow {
      font-size: 11px;
      color: var(--primary);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
    }
    h2, h3 { margin: 6px 0 2px; letter-spacing: -0.02em; }
    h2 { font-size: 26px; }
    h3 { font-size: 20px; }
    .sub, .panel-head p { margin: 0; color: var(--text-muted); font-size: 13px; }
    .head-actions { display: flex; gap: 10px; align-items: center; }
    .head-actions .btn { display: inline-flex; align-items: center; gap: 8px; }
    .icon-btn {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
      border-radius: 10px;
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      cursor: pointer;
    }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .stat, .panel {
      background: var(--bg-elev);
      border: 1px solid var(--border);
      border-radius: 16px;
    }
    .stat { padding: 16px; display: grid; gap: 6px; }
    .stat span, .metric span, .filter span {
      color: var(--text-muted);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .stat strong {
      font-size: 24px;
      font-family: var(--font-mono);
      letter-spacing: -0.02em;
    }
    .stat--vacant { color: var(--status-vacant-text); }
    .panel { padding: 18px; display: flex; flex-direction: column; gap: 16px; }
    .panel-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .panel-head--rooms { align-items: end; flex-wrap: wrap; }
    .room-toolbar { display: flex; gap: 12px; align-items: end; flex-wrap: wrap; }
    .search {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 280px;
      min-width: 0;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 0 12px;
    }
    .search mat-icon { color: var(--text-muted); font-size: 18px; width: 18px; height: 18px; }
    .search input, .filter select {
      width: 100%;
      background: transparent;
      border: 0;
      color: var(--text);
      font-family: inherit;
    }
    .search input { padding: 11px 0; }
    .filter {
      display: grid;
      gap: 6px;
      min-width: 140px;
    }
    .filter select {
      padding: 11px 12px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
    }
    .room-list { display: flex; flex-direction: column; gap: 10px; }
    .room-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: rgba(255,255,255,0.02);
    }
    .room-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .room-title strong { font-size: 15px; }
    .room-meta { margin-top: 5px; color: var(--text-muted); font-size: 12px; }
    .room-metrics { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: flex-end; }
    .metric { display: grid; gap: 4px; min-width: 88px; text-align: right; }
    .metric strong { font-size: 13px; font-family: var(--font-mono); }
    .mini {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font: inherit;
      font-size: 12px;
      color: var(--text-muted);
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 8px 10px;
      cursor: pointer;
    }
    .mini:hover { border-color: var(--primary); color: var(--primary); }
    .mini mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .state {
      min-height: 120px;
      display: grid;
      place-items: center;
      text-align: center;
      color: var(--text-muted);
      border: 1px dashed var(--border);
      border-radius: 14px;
      padding: 24px;
      gap: 8px;
    }
    .state mat-icon { color: var(--primary); }
    @media (max-width: 900px) {
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .room-row { grid-template-columns: 1fr; }
      .room-metrics { justify-content: flex-start; }
      .metric { text-align: left; }
    }
    @media (max-width: 640px) {
      .drawer { padding: 18px; }
      .stats { grid-template-columns: 1fr; }
      .head, .head-actions { flex-direction: column; align-items: stretch; }
      .head-actions .btn { justify-content: center; }
      .icon-btn { align-self: flex-end; }
      .panel-head--rooms .btn { width: 100%; justify-content: center; }
    }
  `]
})
export class PropertyDetailDrawerComponent {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  @Input() property: PG | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() propertySaved = new EventEmitter<PG>();
  @Output() inventoryChanged = new EventEmitter<void>();

  rooms = signal<Room[]>([]);
  loadingRooms = signal(false);
  savingProperty = signal(false);
  savingRoom = signal(false);
  propertyError = signal('');
  roomError = signal('');
  roomEditorOpen = signal(false);
  editingRoom = signal<Room | null>(null);
  roomQuery = signal('');
  floorFilter = signal<number | 'ALL'>('ALL');
  propertyDraft: PgCreatePayload = this.blankPropertyDraft();
  roomDraft: RoomCreatePayload = this.blankRoomDraft();

  floors = computed(() => [...new Set(this.rooms().map(room => room.floor))].sort((left, right) => left - right));
  filteredRooms = computed(() => {
    const query = this.roomQuery().trim().toLowerCase();
    const floor = this.floorFilter();
    return [...this.rooms()]
      .sort((left, right) => left.floor - right.floor || left.roomNumber.localeCompare(right.roomNumber))
      .filter(room => (!query || room.roomNumber.toLowerCase().includes(query)) && (floor === 'ALL' || room.floor === floor));
  });
  occupiedRooms = computed(() => this.rooms().filter(room => room.status !== 'VACANT' && room.status !== 'MAINTENANCE').length);
  averageRent = computed(() => {
    const rooms = this.rooms();
    if (!rooms.length) return 0;
    return rooms.reduce((sum, room) => sum + room.monthlyRent, 0) / rooms.length;
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['property']) {
      const property = this.property;
      this.propertyError.set('');
      this.roomError.set('');
      this.roomQuery.set('');
      this.floorFilter.set('ALL');
      this.closeRoomEditor();
      this.propertyDraft = property ? {
        name: property.name,
        address: property.address,
        totalFloors: property.totalFloors,
        paymentDeadlineDay: property.paymentDeadlineDay,
        fineAmountPerDay: property.fineAmountPerDay,
        slaHours: property.slaHours
      } : this.blankPropertyDraft();
      if (property) {
        this.loadRooms(property.id);
      } else {
        this.rooms.set([]);
      }
    }
  }

  loadRooms(pgId: number) {
    this.loadingRooms.set(true);
    this.rooms.set([]);
    this.api.listRooms(pgId).subscribe({
      next: rooms => {
        this.rooms.set(rooms);
        this.loadingRooms.set(false);
      },
      error: err => {
        this.loadingRooms.set(false);
        this.snack.open(err?.message || 'Could not load rooms', 'Dismiss', { duration: 3200, panelClass: 'pgms-snack' });
      }
    });
  }

  saveProperty(payload: PgCreatePayload) {
    if (!this.property) return;
    this.savingProperty.set(true);
    this.propertyError.set('');
    this.api.updatePg(this.property.id, payload).subscribe({
      next: pg => {
        this.propertyDraft = { ...payload };
        this.savingProperty.set(false);
        this.propertySaved.emit(pg);
        this.snack.open('Property details updated', 'OK', { duration: 2200, panelClass: 'pgms-snack' });
      },
      error: err => {
        this.savingProperty.set(false);
        this.propertyError.set(err?.message || 'Could not update property');
      }
    });
  }

  openRoomEditor(room?: Room) {
    this.editingRoom.set(room || null);
    this.roomError.set('');
    this.roomDraft = room ? {
      roomNumber: room.roomNumber,
      floor: room.floor,
      isAC: room.isAC,
      sharingType: room.sharingType,
      monthlyRent: room.monthlyRent,
      depositAmount: room.depositAmount || 0,
      status: room.status === 'PARTIAL' ? 'OCCUPIED' : room.status,
      cleaningStatus: room.cleaningStatus || 'CLEAN'
    } : this.blankRoomDraft();
    this.roomEditorOpen.set(true);
  }

  closeRoomEditor() {
    this.roomEditorOpen.set(false);
    this.editingRoom.set(null);
    this.savingRoom.set(false);
    this.roomError.set('');
    this.roomDraft = this.blankRoomDraft();
  }

  saveRoom(payload: RoomCreatePayload) {
    if (!this.property) return;
    this.savingRoom.set(true);
    this.roomError.set('');
    const editing = this.editingRoom();

    const request = editing
      ? this.api.updateRoom(editing.id, payload)
      : this.api.createRoom(this.property.id, payload);

    request.subscribe({
      next: () => {
        this.savingRoom.set(false);
        this.closeRoomEditor();
        this.loadRooms(this.property!.id);
        this.inventoryChanged.emit();
        this.snack.open(editing ? 'Room updated' : 'Room added', 'OK', { duration: 2200, panelClass: 'pgms-snack' });
      },
      error: err => {
        this.savingRoom.set(false);
        this.roomError.set(err?.message || 'Could not save room');
      }
    });
  }

  setFloorFilter(value: number | 'ALL') {
    this.floorFilter.set(value);
  }

  statusClass(status: Room['status']): string {
    return `pill--${status.toLowerCase()}`;
  }

  capacityFor(sharingType: Room['sharingType']): number {
    switch (sharingType) {
      case 'SINGLE': return 1;
      case 'DOUBLE': return 2;
      case 'TRIPLE': return 3;
      case 'DORM': return 6;
    }
  }

  private blankPropertyDraft(): PgCreatePayload {
    return {
      name: '',
      address: '',
      totalFloors: 1,
      paymentDeadlineDay: 5,
      fineAmountPerDay: 100,
      slaHours: 48
    };
  }

  private blankRoomDraft(): RoomCreatePayload {
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
