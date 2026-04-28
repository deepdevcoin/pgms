import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AmenityBooking } from '../../core/models';
import { DisplayDatePipe } from '../../shared/display-date.pipe';

type DayGroup = { date: string; items: AmenityBooking[] };
type MachineWindow = { key: string; timeKey: string; timeLabel: string; location: string; slots: AmenityBooking[] };
type MachineDayGroup = { date: string; items: MachineWindow[] };

@Component({
  selector: 'app-amenity-slot-board',
  standalone: true,
  imports: [CommonModule, MatIconModule, DisplayDatePipe],
  template: `
    @if (rows().length === 0) {
      <div class="state card">
        <mat-icon>event_busy</mat-icon>
        <span>{{ emptyLabel() }}</span>
      </div>
    } @else {
      <div class="board">
        @if (bookedRows().length) {
          <section class="lane lane--booked">
            <div class="lane-head">
              <div>
                <div class="lane-title">Your bookings</div>
                <div class="lane-subtitle">Keep track of your current amenity reservations in one place.</div>
              </div>
              <div class="lane-meta">{{ bookedRows().length }} active</div>
            </div>

            <div class="booking-strip">
              @for (slot of bookedRows(); track trackSlot(slot)) {
                <article class="booking-card" [class.booking-card--offline]="isManagementBlocked(slot)">
                  <div class="booking-top">
                    <div>
                      <div class="booking-title">{{ bookingTitle(slot) }}</div>
                      <div class="booking-sub">{{ bookingSubtitle(slot) }}</div>
                    </div>
                    @if (isManagementBlocked(slot)) {
                      <span class="mini-badge mini-badge--warn">{{ managementLabel(slot) }}</span>
                    } @else {
                      <span class="mini-badge">Booked</span>
                    }
                  </div>
                  <div class="booking-time">{{ slot.slotDate | displayDate }} · {{ timeRange(slot) }}</div>
                  @if (slot.hostName && slot.tenantName !== slot.hostName) {
                    <div class="booking-note">Host: <strong>{{ slot.hostName }}</strong></div>
                  } @else if (slot.hostName && slot.tenantName === slot.hostName) {
                    <div class="booking-note">You are hosting this session.</div>
                  } @else {
                    <div class="booking-note">{{ isManagementBlocked(slot) ? managementMessage(slot) : 'Reserved for you.' }}</div>
                  }
                  <button class="btn btn--ghost" type="button" (click)="runCancel(slot)">
                    <mat-icon>event_busy</mat-icon>
                    <span>Cancel</span>
                  </button>
                </article>
              }
            </div>
          </section>
        }

        @if (machineGroups().length) {
          <section class="lane">
            <div class="lane-head">
              <div>
                <div class="lane-title">Machine slots</div>
                <div class="lane-subtitle">Choose a time first, then pick any free machine in that window.</div>
              </div>
              <div class="lane-meta">{{ machineWindowCount() }} time window{{ machineWindowCount() === 1 ? '' : 's' }}</div>
            </div>

            @for (group of machineGroups(); track group.date) {
              <section class="day-block">
                <div class="day-head">
                  <div class="day-name">{{ group.date | date:'EEEE' }}</div>
                  <div class="day-date">{{ group.date | displayDate }}</div>
                </div>

                <div class="machine-list">
                  @for (item of group.items; track item.key) {
                    <article class="machine-row">
                      <div class="machine-time">
                        <strong>{{ item.timeLabel }}</strong>
                        <span>{{ item.location }}</span>
                      </div>

                      <div class="machine-units">
                        @for (slot of item.slots; track trackSlot(slot)) {
                          <button
                            class="unit-pill"
                            type="button"
                            [class.unit-pill--booked]="isBooked(slot)"
                            [class.unit-pill--full]="isFull(slot)"
                            [class.unit-pill--offline]="isManagementBlocked(slot)"
                            [disabled]="isMachineDisabled(slot)"
                            (click)="runMachineAction(slot)"
                          >
                            <span class="unit-name">{{ slot.resourceName || 'Machine' }}</span>
                            <span class="unit-state">{{ machineButtonState(slot) }}</span>
                          </button>
                        }
                      </div>
                    </article>
                  }
                </div>
              </section>
            }
          </section>
        }

        @if (sharedGroups().length) {
          <section class="lane">
            <div class="lane-head">
              <div>
                <div class="lane-title">Shared sessions</div>
                <div class="lane-subtitle">Host a session when a slot is empty, or join a session that already has a host.</div>
              </div>
              <div class="lane-meta">{{ sharedRows().length }} session{{ sharedRows().length === 1 ? '' : 's' }}</div>
            </div>

            @for (group of sharedGroups(); track group.date) {
              <section class="day-block">
                <div class="day-head">
                  <div class="day-name">{{ group.date | date:'EEEE' }}</div>
                  <div class="day-date">{{ group.date | displayDate }}</div>
                </div>

                <div class="shared-list">
                  @for (slot of group.items; track trackSlot(slot)) {
                    <article class="shared-row" [class.shared-row--offline]="isManagementBlocked(slot)">
                      <div class="shared-main">
                        <strong>{{ amenityLabel(slot) }}</strong>
                        <span>{{ sessionLocation(slot) }}</span>
                      </div>

                      <div class="shared-time">{{ timeRange(slot) }}</div>

                      <div class="shared-meta">
                        <span>{{ sharedSummary(slot) }}</span>
                        @if (slot.hostName) {
                          <span>Host: <strong>{{ slot.hostName }}</strong></span>
                        } @else {
                          <span>No host yet</span>
                        }
                      </div>

                      <div class="shared-status">
                        @if (isManagementBlocked(slot)) {
                          <span class="mini-badge mini-badge--warn">{{ managementLabel(slot) }}</span>
                        } @else {
                          <span class="mini-badge" [class.mini-badge--blue]="canJoinHost(slot)">{{ badgeLabel(slot) }}</span>
                        }
                        <button
                          class="btn"
                          type="button"
                          [class.btn--primary]="sharedActionKind(slot) === 'join'"
                          [class.btn--ghost]="sharedActionKind(slot) === 'host' || sharedActionKind(slot) === 'cancel'"
                          [class.btn--danger]="sharedActionKind(slot) === 'disabled'"
                          [disabled]="sharedActionKind(slot) === 'disabled'"
                          (click)="runSharedAction(slot)"
                        >
                          <mat-icon>{{ sharedActionIcon(slot) }}</mat-icon>
                          <span>{{ sharedActionLabel(slot) }}</span>
                        </button>
                      </div>
                    </article>
                  }
                </div>
              </section>
            }
          </section>
        }
      </div>
    }
  `,
  styles: [`
    .board { display: grid; gap: 18px; }
    .lane {
      display: grid;
      gap: 14px;
      padding: 18px;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: var(--surface);
    }
    .lane--booked {
      background:
        linear-gradient(180deg, rgba(20,83,45,0.16), rgba(5,46,22,0.06)),
        var(--surface);
      border-color: rgba(34,197,94,0.2);
    }
    .lane-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-end;
      flex-wrap: wrap;
    }
    .lane-title { font-size: 18px; font-weight: 800; }
    .lane-subtitle, .lane-meta { color: var(--text-muted); font-size: 12px; }
    .booking-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }
    .booking-card {
      display: grid;
      gap: 10px;
      padding: 14px;
      border: 1px solid rgba(34,197,94,0.2);
      border-radius: 14px;
      background: rgba(255,255,255,0.02);
    }
    .booking-card--offline {
      border-color: rgba(148,163,184,0.28);
      background: rgba(148,163,184,0.06);
    }
    .booking-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
    }
    .booking-title { font-weight: 700; }
    .booking-sub, .booking-time, .booking-note { color: var(--text-muted); font-size: 12px; line-height: 1.45; }
    .booking-note strong { color: var(--text); }
    .day-block {
      display: grid;
      gap: 10px;
    }
    .day-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding-top: 4px;
    }
    .day-name { font-size: 16px; font-weight: 700; }
    .day-date { font-size: 12px; color: var(--text-muted); }
    .machine-list, .shared-list {
      display: grid;
      gap: 10px;
    }
    .machine-row, .shared-row {
      display: grid;
      gap: 12px;
      padding: 14px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: rgba(255,255,255,0.02);
    }
    .machine-row {
      grid-template-columns: minmax(140px, 180px) 1fr;
      align-items: center;
    }
    .machine-time strong, .shared-main strong {
      display: block;
      font-size: 14px;
      font-weight: 700;
    }
    .machine-time span, .shared-main span, .shared-meta {
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .machine-units {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .unit-pill {
      min-width: 116px;
      display: grid;
      gap: 2px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--bg-elev);
      color: var(--text);
      cursor: pointer;
      text-align: left;
    }
    .unit-pill--booked {
      border-color: rgba(34,197,94,0.35);
      background: rgba(34,197,94,0.12);
    }
    .unit-pill--full {
      border-color: rgba(248,113,113,0.25);
      background: rgba(248,113,113,0.1);
      color: #fca5a5;
    }
    .unit-pill--offline {
      border-color: rgba(148,163,184,0.28);
      background: rgba(148,163,184,0.08);
      color: #e2e8f0;
    }
    .unit-pill:disabled {
      cursor: not-allowed;
      opacity: 0.82;
    }
    .unit-name { font-size: 13px; font-weight: 700; }
    .unit-state { font-size: 11px; color: var(--text-muted); }
    .shared-row {
      grid-template-columns: minmax(160px, 1fr) 160px minmax(180px, 1fr) auto;
      align-items: center;
    }
    .shared-row--offline {
      border-color: rgba(148,163,184,0.28);
      background: rgba(148,163,184,0.06);
    }
    .shared-time {
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 700;
    }
    .shared-meta {
      display: grid;
      gap: 2px;
    }
    .shared-meta strong { color: var(--text); }
    .shared-status {
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .mini-badge {
      padding: 5px 9px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .mini-badge--warn {
      background: rgba(148,163,184,0.18);
      color: #e2e8f0;
    }
    .mini-badge--blue {
      background: rgba(96,165,250,0.16);
      color: #bfdbfe;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: 12px;
      height: 38px;
      padding: 0 12px;
      border: 1px solid var(--border);
      background: var(--bg-elev);
      color: var(--text);
      cursor: pointer;
      font-weight: 600;
    }
    .btn mat-icon { width: 16px; height: 16px; font-size: 16px; }
    .btn--primary {
      background: rgba(96,165,250,0.14);
      border-color: rgba(96,165,250,0.38);
      color: #bfdbfe;
    }
    .btn--ghost {
      background: rgba(255,255,255,0.03);
      color: var(--text-muted);
    }
    .btn--danger {
      background: rgba(248,113,113,0.14);
      border-color: rgba(248,113,113,0.35);
      color: #fca5a5;
      cursor: not-allowed;
    }
    .btn:disabled { opacity: 1; cursor: not-allowed; }
    .state {
      min-height: 180px;
      display: grid;
      place-items: center;
      gap: 10px;
      padding: 28px;
      color: var(--text-muted);
      text-align: center;
    }
    @media (max-width: 980px) {
      .machine-row,
      .shared-row {
        grid-template-columns: 1fr;
        align-items: start;
      }
      .shared-status {
        justify-content: flex-start;
      }
    }
  `]
})
export class AmenitySlotBoardComponent {
  rows = input<AmenityBooking[]>([]);
  emptyLabel = input('No amenity slots available right now.');
  book = input<(row: AmenityBooking) => void>(() => undefined);
  openInvite = input<(row: AmenityBooking) => void>(() => undefined);
  joinInvite = input<(row: AmenityBooking) => void>(() => undefined);
  cancel = input<(row: AmenityBooking) => void>(() => undefined);

  bookedRows = computed(() =>
    [...this.rows()]
      .filter(row => this.isBooked(row))
      .sort((a, b) => `${a.slotDate}-${a.startTime}-${a.resourceName || ''}`.localeCompare(`${b.slotDate}-${b.startTime}-${b.resourceName || ''}`))
  );

  exclusiveRows = computed(() => this.rows().filter(row => !this.supportsInvite(row)));
  sharedRows = computed(() => this.rows().filter(row => this.supportsInvite(row)));

  machineGroups = computed(() => this.groupMachineRows(this.exclusiveRows()));
  sharedGroups = computed(() => this.groupSharedRows(this.sharedRows()));
  machineWindowCount = computed(() => this.machineGroups().reduce((count, group) => count + group.items.length, 0));

  private groupMachineRows(rows: AmenityBooking[]): MachineDayGroup[] {
    const byDate = new Map<string, AmenityBooking[]>();
    for (const row of rows) {
      const date = row.slotDate || 'unknown';
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(row);
    }

    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => {
        const byWindow = new Map<string, AmenityBooking[]>();
        for (const slot of items) {
          const key = `${slot.startTime}|${slot.endTime}|${slot.facilityName || ''}|${slot.displayName || ''}`;
          if (!byWindow.has(key)) byWindow.set(key, []);
          byWindow.get(key)!.push(slot);
        }
        const windows: MachineWindow[] = [...byWindow.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([key, slots]) => ({
            key,
            timeKey: `${slots[0]?.startTime || ''}-${slots[0]?.endTime || ''}`,
            timeLabel: this.timeRange(slots[0]),
            location: `${slots[0]?.displayName || 'Washing Machine'} · ${slots[0]?.facilityName || 'Laundry Room'}`,
            slots: [...slots].sort((a, b) => (a.resourceName || '').localeCompare(b.resourceName || ''))
          }));
        return { date, items: windows };
      });
  }

  private groupSharedRows(rows: AmenityBooking[]): DayGroup[] {
    const groups = new Map<string, AmenityBooking[]>();
    for (const row of rows) {
      const date = row.slotDate || 'unknown';
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date)!.push(row);
    }
    return [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => ({
        date,
        items: [...items].sort((a, b) =>
          `${this.availabilityRank(a)}-${a.startTime}-${a.facilityName || a.amenityType}-${a.resourceName || ''}`.localeCompare(
            `${this.availabilityRank(b)}-${b.startTime}-${b.facilityName || b.amenityType}-${b.resourceName || ''}`
          )
        )
      }));
  }

  isBooked(slot: AmenityBooking): boolean {
    return Number(slot.bookingId || 0) > 0;
  }

  isFull(slot: AmenityBooking): boolean {
    return !this.isBooked(slot) && Number(slot.bookingCount || 0) >= Number(slot.capacity || 0);
  }

  isOccupied(slot: AmenityBooking): boolean {
    return !this.isBooked(slot) && Number(slot.bookingCount || 0) > 0 && !this.canJoinHost(slot) && !this.isFull(slot);
  }

  canJoinHost(slot: AmenityBooking): boolean {
    return this.supportsInvite(slot) && !this.isBooked(slot) && (!!slot.joinable || (!!slot.hostName && !!slot.openInvite));
  }

  supportsInvite(slot: AmenityBooking): boolean {
    return !!slot.shareable;
  }

  isManagementBlocked(slot: AmenityBooking): boolean {
    return slot.enabled === false || !!slot.maintenanceMode;
  }

  managementLabel(slot: AmenityBooking): string {
    if (slot.maintenanceMode) return 'Maintenance';
    if (slot.enabled === false) return 'Disabled';
    return '';
  }

  managementMessage(slot: AmenityBooking): string {
    if (slot.maintenanceMode) {
      return this.isBooked(slot)
        ? 'Management marked this amenity under maintenance. Your booking is still on record.'
        : 'Management marked this amenity under maintenance.';
    }
    if (slot.enabled === false) {
      return this.isBooked(slot)
        ? 'Management disabled this amenity. Your booking is still visible here.'
        : 'Management disabled this amenity.';
    }
    return '';
  }

  badgeLabel(slot: AmenityBooking): string {
    if (slot.maintenanceMode) return 'Maintenance';
    if (slot.enabled === false) return 'Disabled';
    if (this.isBooked(slot)) return 'Booked';
    if (this.canJoinHost(slot)) return 'Joinable';
    if (this.isFull(slot)) return 'Full';
    if (this.isOccupied(slot)) return 'In use';
    return 'Free';
  }

  bookingTitle(slot: AmenityBooking): string {
    return this.supportsInvite(slot) ? this.amenityLabel(slot) : (slot.resourceName || 'Machine');
  }

  bookingSubtitle(slot: AmenityBooking): string {
    return this.supportsInvite(slot)
      ? this.sessionLocation(slot)
      : `${slot.displayName || 'Washing Machine'} · ${slot.facilityName || 'Laundry Room'}`;
  }

  machineButtonState(slot: AmenityBooking): string {
    if (this.isBooked(slot)) return 'Reserved';
    if (this.isManagementBlocked(slot)) return this.managementLabel(slot);
    if (this.isFull(slot)) return 'Taken';
    return 'Book';
  }

  isMachineDisabled(slot: AmenityBooking): boolean {
    return !this.isBooked(slot) && (this.isManagementBlocked(slot) || this.isFull(slot));
  }

  sharedSummary(slot: AmenityBooking): string {
    if (this.isBooked(slot) && slot.tenantName === slot.hostName) {
      return `You are hosting · ${slot.bookingCount || 0}/${slot.capacity}`;
    }
    if (this.isBooked(slot)) {
      return `Reserved · ${slot.bookingCount || 0}/${slot.capacity}`;
    }
    if (slot.hostName) {
      return `${slot.bookingCount || 0}/${slot.capacity} joined`;
    }
    return `${slot.bookingCount || 0}/${slot.capacity} joined`;
  }

  sharedActionKind(slot: AmenityBooking): 'cancel' | 'join' | 'host' | 'disabled' {
    if (this.isBooked(slot)) return 'cancel';
    if (this.isManagementBlocked(slot) || this.isFull(slot) || this.isOccupied(slot)) return 'disabled';
    if (this.canJoinHost(slot)) return 'join';
    return 'host';
  }

  sharedActionLabel(slot: AmenityBooking): string {
    switch (this.sharedActionKind(slot)) {
      case 'cancel': return 'Cancel';
      case 'join': return 'Join';
      case 'host': return 'Host';
      default:
        if (this.isManagementBlocked(slot)) return this.managementLabel(slot);
        if (this.isOccupied(slot)) return 'Private';
        return 'Full';
    }
  }

  sharedActionIcon(slot: AmenityBooking): string {
    switch (this.sharedActionKind(slot)) {
      case 'cancel': return 'event_busy';
      case 'join': return 'group_add';
      case 'host': return 'groups';
      default:
        if (this.isManagementBlocked(slot)) return 'block';
        if (this.isOccupied(slot)) return 'lock';
        return 'block';
    }
  }

  amenityLabel(slot: AmenityBooking): string {
    return slot.displayName || String(slot.amenityType || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  }

  sessionLocation(slot: AmenityBooking): string {
    if (slot.resourceName && slot.facilityName) return `${slot.resourceName} · ${slot.facilityName}`;
    return slot.facilityName || slot.resourceName || 'Shared facility';
  }

  timeRange(slot?: AmenityBooking): string {
    return `${this.timeLabel(slot?.startTime)} - ${this.timeLabel(slot?.endTime)}`;
  }

  timeLabel(value?: string): string {
    const [hours, minutes] = String(value || '').split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value || '';
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const normalizedHours = hours % 12 || 12;
    return `${normalizedHours}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  private availabilityRank(slot: AmenityBooking): number {
    if (this.canJoinHost(slot)) return 0;
    if (!this.isBooked(slot) && !this.isOccupied(slot) && !this.isFull(slot)) return 1;
    if (this.isBooked(slot)) return 2;
    if (this.isOccupied(slot)) return 3;
    return 4;
  }

  trackSlot(slot: AmenityBooking): string {
    return String(slot.bookingId || `${slot.slotId}-${slot.startTime}-${slot.endTime}-${slot.resourceName || ''}`);
  }

  runMachineAction(slot: AmenityBooking) {
    if (this.isBooked(slot)) {
      this.runCancel(slot);
      return;
    }
    if (!this.isMachineDisabled(slot)) {
      this.runBook(slot);
    }
  }

  runSharedAction(slot: AmenityBooking) {
    switch (this.sharedActionKind(slot)) {
      case 'cancel':
        this.runCancel(slot);
        break;
      case 'join':
        this.runJoin(slot);
        break;
      case 'host':
        this.runOpenInvite(slot);
        break;
      default:
        break;
    }
  }

  runBook(slot: AmenityBooking) { this.book()(slot); }
  runOpenInvite(slot: AmenityBooking) { this.openInvite()(slot); }
  runJoin(slot: AmenityBooking) { this.joinInvite()(slot); }
  runCancel(slot: AmenityBooking) { this.cancel()(slot); }
}
