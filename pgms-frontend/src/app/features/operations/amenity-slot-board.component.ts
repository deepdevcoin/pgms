import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AmenityBooking } from '../../core/models';
import { DisplayDatePipe } from '../../shared/display-date.pipe';

type ResourceDateGroup = { date: string; slots: AmenityBooking[] };
type ResourceGroup = { key: string; title: string; subtitle: string; dates: ResourceDateGroup[] };

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
              <div class="lane-title">Your bookings</div>
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
                    <span class="mini-badge" [class.mini-badge--warn]="isManagementBlocked(slot)">
                      {{ isManagementBlocked(slot) ? managementLabel(slot) : 'Booked' }}
                    </span>
                  </div>
                  <div class="booking-time">{{ slot.slotDate | displayDate }} · {{ timeRange(slot) }}</div>
                  <div class="booking-note">
                    @if (slot.hostName && slot.tenantName === slot.hostName) {
                      You are hosting this session.
                    } @else if (slot.hostName) {
                      Host: <strong>{{ slot.hostName }}</strong>
                    } @else if (isManagementBlocked(slot)) {
                      {{ managementMessage(slot) }}
                    } @else {
                      Reserved for you.
                    }
                  </div>
                  <button class="btn btn--ghost" type="button" (click)="runCancel(slot)">
                    <mat-icon>event_busy</mat-icon>
                    <span>Cancel</span>
                  </button>
                </article>
              }
            </div>
          </section>
        }

        @if (machineResources().length) {
          <section class="lane">
            <div class="lane-head">
              <div class="lane-title">Machines</div>
              <div class="lane-meta">{{ machineResources().length }} machine{{ machineResources().length === 1 ? '' : 's' }}</div>
            </div>

            <div class="resource-grid">
              @for (resource of machineResources(); track resource.key) {
                <article class="resource-card">
                  <div class="resource-head">
                    <div>
                      <div class="resource-title">{{ resource.title }}</div>
                      <div class="resource-subtitle">{{ resource.subtitle }}</div>
                    </div>
                  </div>

                  @for (day of resource.dates; track day.date) {
                    <section class="date-block">
                      <div class="date-head">
                        <strong>{{ day.date | date:'EEEE' }}</strong>
                        <span>{{ day.date | displayDate }}</span>
                      </div>
                      <div class="slot-pill-grid">
                        @for (slot of day.slots; track trackSlot(slot)) {
                          <button
                            class="slot-pill"
                            type="button"
                            [class.slot-pill--booked]="isBooked(slot)"
                            [class.slot-pill--full]="isFull(slot)"
                            [class.slot-pill--offline]="isManagementBlocked(slot)"
                            [disabled]="isMachineDisabled(slot)"
                            (click)="runMachineAction(slot)"
                          >
                            <span class="slot-pill-time">{{ timeRange(slot) }}</span>
                            <span class="slot-pill-state">{{ machineButtonState(slot) }}</span>
                          </button>
                        }
                      </div>
                    </section>
                  }
                </article>
              }
            </div>
          </section>
        }

        @if (sharedResources().length) {
          <section class="lane">
            <div class="lane-head">
              <div class="lane-title">Shared games</div>
              <div class="lane-meta">{{ sharedResources().length }} resource{{ sharedResources().length === 1 ? '' : 's' }}</div>
            </div>

            <div class="resource-grid">
              @for (resource of sharedResources(); track resource.key) {
                <article class="resource-card">
                  <div class="resource-head">
                    <div>
                      <div class="resource-title">{{ resource.title }}</div>
                      <div class="resource-subtitle">{{ resource.subtitle }}</div>
                    </div>
                  </div>

                  @for (day of resource.dates; track day.date) {
                    <section class="date-block">
                      <div class="date-head">
                        <strong>{{ day.date | date:'EEEE' }}</strong>
                        <span>{{ day.date | displayDate }}</span>
                      </div>
                      <div class="shared-slot-list">
                        @for (slot of day.slots; track trackSlot(slot)) {
                          <div class="shared-slot" [class.shared-slot--offline]="isManagementBlocked(slot)">
                            <div class="shared-slot-copy">
                              <strong>{{ timeRange(slot) }}</strong>
                              <span>{{ sharedSummary(slot) }}</span>
                              @if (slot.hostName) {
                                <span>Host: <strong>{{ slot.hostName }}</strong></span>
                              } @else if (isManagementBlocked(slot)) {
                                <span>{{ managementMessage(slot) }}</span>
                              } @else {
                                <span>No host yet</span>
                              }
                            </div>

                            <div class="shared-slot-action">
                              <span class="mini-badge" [class.mini-badge--warn]="isManagementBlocked(slot)" [class.mini-badge--blue]="canJoinHost(slot) && !isManagementBlocked(slot)">
                                {{ isManagementBlocked(slot) ? managementLabel(slot) : badgeLabel(slot) }}
                              </span>
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
                          </div>
                        }
                      </div>
                    </section>
                  }
                </article>
              }
            </div>
          </section>
        }
      </div>
    }
  `,
  styles: [`
    .board { display: grid; gap: 14px; }
    .lane {
      display: grid;
      gap: 10px;
      padding: 14px;
      border: 1px solid var(--border);
      border-radius: 14px;
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
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .lane-title { font-size: 16px; font-weight: 800; }
    .lane-meta { color: var(--text-muted); font-size: 11px; }

    .booking-strip,
    .resource-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
    }

    .booking-card,
    .resource-card {
      display: grid;
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: rgba(255,255,255,0.02);
      min-width: 0;
    }
    .booking-card { border-color: rgba(34,197,94,0.2); }
    .booking-card--offline { border-color: rgba(148,163,184,0.28); background: rgba(148,163,184,0.06); }

    .booking-top,
    .resource-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
    }
    .booking-title,
    .resource-title {
      font-size: 14px;
      font-weight: 700;
    }
    .booking-sub,
    .booking-time,
    .booking-note,
    .resource-subtitle {
      color: var(--text-muted);
      font-size: 11px;
      line-height: 1.35;
    }
    .booking-note strong { color: var(--text); }

    .date-block {
      display: grid;
      gap: 6px;
      padding-top: 6px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .date-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
    }
    .date-head strong { font-size: 12px; }
    .date-head span { font-size: 11px; color: var(--text-muted); }

    .slot-pill-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(98px, 1fr));
      gap: 6px;
    }
    .slot-pill {
      display: grid;
      gap: 2px;
      padding: 8px 9px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--bg-elev);
      color: var(--text);
      cursor: pointer;
      text-align: left;
      min-height: 48px;
    }
    .slot-pill--booked {
      border-color: rgba(34,197,94,0.35);
      background: rgba(34,197,94,0.12);
    }
    .slot-pill--full {
      border-color: rgba(248,113,113,0.28);
      background: rgba(248,113,113,0.1);
      color: #fca5a5;
    }
    .slot-pill--offline {
      border-color: rgba(148,163,184,0.28);
      background: rgba(148,163,184,0.08);
      color: #e2e8f0;
    }
    .slot-pill:disabled {
      cursor: not-allowed;
      opacity: 0.82;
    }
    .slot-pill-time {
      font-size: 12px;
      font-weight: 700;
    }
    .slot-pill-state {
      font-size: 10px;
      color: var(--text-muted);
    }

    .shared-slot-list {
      display: grid;
      gap: 6px;
    }
    .shared-slot {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      padding: 8px 10px;
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 10px;
      background: rgba(255,255,255,0.02);
      align-items: center;
    }
    .shared-slot--offline {
      border-color: rgba(148,163,184,0.28);
      background: rgba(148,163,184,0.06);
    }
    .shared-slot-copy {
      display: grid;
      gap: 1px;
      min-width: 0;
    }
    .shared-slot-copy strong {
      font-size: 12px;
      font-weight: 700;
    }
    .shared-slot-copy span {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.3;
    }
    .shared-slot-copy span strong { color: var(--text); }
    .shared-slot-action {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .mini-badge {
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      color: var(--text-muted);
      font-size: 10px;
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
      gap: 6px;
      border-radius: 10px;
      height: 34px;
      padding: 0 10px;
      border: 1px solid var(--border);
      background: var(--bg-elev);
      color: var(--text);
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
    }
    .btn mat-icon { width: 14px; height: 14px; font-size: 14px; }
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

    @media (max-width: 720px) {
      .shared-slot {
        grid-template-columns: 1fr;
      }
      .shared-slot-action {
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

  machineResources = computed(() => this.groupByResource(this.exclusiveRows(), 'machine'));
  sharedResources = computed(() => this.groupByResource(this.sharedRows(), 'shared'));

  private groupByResource(rows: AmenityBooking[], mode: 'machine' | 'shared'): ResourceGroup[] {
    const byResource = new Map<string, AmenityBooking[]>();
    for (const row of rows) {
      const key = mode === 'machine'
        ? `${row.resourceName || 'Machine'}|${row.facilityName || ''}|${row.displayName || ''}`
        : `${this.amenityLabel(row)}|${row.resourceName || ''}|${row.facilityName || ''}`;
      if (!byResource.has(key)) byResource.set(key, []);
      byResource.get(key)!.push(row);
    }

    return [...byResource.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, items]) => {
        const first = items[0];
        const byDate = new Map<string, AmenityBooking[]>();
        for (const slot of items) {
          const date = slot.slotDate || 'unknown';
          if (!byDate.has(date)) byDate.set(date, []);
          byDate.get(date)!.push(slot);
        }
        const dates = [...byDate.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, slots]) => ({
            date,
            slots: [...slots].sort((a, b) =>
              `${a.startTime}-${this.availabilityRank(a)}-${a.resourceName || ''}`.localeCompare(
                `${b.startTime}-${this.availabilityRank(b)}-${b.resourceName || ''}`
              )
            )
          }));

        return {
          key,
          title: mode === 'machine' ? (first?.resourceName || 'Machine') : this.amenityLabel(first),
          subtitle: mode === 'machine'
            ? `${first?.displayName || 'Washing Machine'} · ${first?.facilityName || 'Laundry Room'}`
            : this.sessionLocation(first),
          dates
        };
      });
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

  amenityLabel(slot?: AmenityBooking): string {
    return slot?.displayName || String(slot?.amenityType || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  }

  sessionLocation(slot?: AmenityBooking): string {
    if (!slot) return 'Shared facility';
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
    if (this.isBooked(slot)) return 0;
    if (this.canJoinHost(slot)) return 1;
    if (!this.isOccupied(slot) && !this.isFull(slot)) return 2;
    if (this.isOccupied(slot)) return 3;
    return 4;
  }

  trackSlot(slot: AmenityBooking): string {
    return String(slot.bookingId || `${slot.slotId}-${slot.slotDate}-${slot.startTime}-${slot.endTime}-${slot.resourceName || ''}`);
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
