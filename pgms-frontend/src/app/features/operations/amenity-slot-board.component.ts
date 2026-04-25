import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AmenityBooking } from '../../core/models';

@Component({
  selector: 'app-amenity-slot-board',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (rows().length === 0) {
      <div class="state card">
        <mat-icon>event_busy</mat-icon>
        <span>{{ emptyLabel() }}</span>
      </div>
    } @else {
      <div class="board">
        @if (exclusiveGroups().length) {
          <section class="lane">
            <div class="lane-head">
              <div>
                <div class="lane-title">Machine bookings</div>
                <div class="lane-subtitle">Reserve one machine for your own time window.</div>
              </div>
              <div class="lane-meta">{{ exclusiveCount() }} upcoming unit{{ exclusiveCount() === 1 ? '' : 's' }}</div>
            </div>
            @for (group of exclusiveGroups(); track group.date) {
              <section class="day-strip">
                <div class="day-head">
                  <div>
                    <div class="day-name">{{ group.date | date:'EEEE' }}</div>
                    <div class="day-date">{{ group.date | date:'mediumDate' }}</div>
                  </div>
                </div>
                <div class="slot-grid">
                  @for (slot of group.items; track trackSlot(slot)) {
                    <article
                      class="slot-card slot-card--machine"
                      [class.slot-card--booked]="isBooked(slot)"
                      [class.slot-card--full]="isFull(slot)"
                    >
                      <div class="slot-top">
                        <div>
                          <div class="slot-facility">{{ slot.resourceName || 'Machine' }}</div>
                          <div class="slot-type">{{ slot.facilityName || 'Laundry Room' }}</div>
                        </div>
                        <span class="slot-badge" [class.slot-badge--red]="isFull(slot)" [class.slot-badge--green]="isBooked(slot)">
                          {{ badgeLabel(slot) }}
                        </span>
                      </div>
                      <div class="slot-time">{{ slot.startTime }} - {{ slot.endTime }}</div>
                      <div class="slot-state-row">
                        <span class="state-chip state-chip--private">Private booking</span>
                        @if (!isBooked(slot) && slot.bookedByName) {
                          <span class="state-text">Booked by <strong>{{ slot.bookedByName }}</strong></span>
                        } @else if (isBooked(slot)) {
                          <span class="state-text">Reserved for you</span>
                        } @else {
                          <span class="state-text">No one has taken this unit yet</span>
                        }
                      </div>
                      <div class="slot-note" [class.slot-note--red]="isFull(slot)">
                        @if (isBooked(slot)) {
                          Reserved for you during this machine slot.
                        } @else if (isFull(slot)) {
                          This machine is already taken for this time.
                        } @else {
                          Free machine slot. Book this unit for yourself.
                        }
                      </div>
                      @if (!isBooked(slot) && slot.bookedByName) {
                        <div class="slot-occupant">
                          Booked by <strong>{{ slot.bookedByName }}</strong>
                        </div>
                      }
                      <div class="slot-actions">
                        @if (isBooked(slot)) {
                          <button class="btn btn--ghost" type="button" (click)="runCancel(slot)">
                            <mat-icon>event_busy</mat-icon>
                            <span>Cancel</span>
                          </button>
                        } @else if (isFull(slot)) {
                          <button class="btn btn--danger" type="button" disabled>
                            <mat-icon>block</mat-icon>
                            <span>Occupied</span>
                          </button>
                        } @else {
                          <button class="btn btn--primary" type="button" (click)="runBook(slot)">
                            <mat-icon>local_laundry_service</mat-icon>
                            <span>Book machine</span>
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
                <div class="lane-subtitle">Host a game session or join a slot that already has a host.</div>
              </div>
              <div class="lane-meta">{{ sharedCount() }} upcoming session{{ sharedCount() === 1 ? '' : 's' }}</div>
            </div>
            @for (group of sharedGroups(); track group.date) {
              <section class="day-strip">
                <div class="day-head">
                  <div>
                    <div class="day-name">{{ group.date | date:'EEEE' }}</div>
                    <div class="day-date">{{ group.date | date:'mediumDate' }}</div>
                  </div>
                </div>
                <div class="slot-grid">
                  @for (slot of group.items; track trackSlot(slot)) {
                    <article
                      class="slot-card"
                      [class.slot-card--booked]="isBooked(slot)"
                      [class.slot-card--full]="isFull(slot)"
                      [class.slot-card--invite]="isInvite(slot)"
                      [class.slot-card--occupied]="isOccupied(slot)"
                    >
                      <div class="slot-top">
                        <div>
                          <div class="slot-facility">{{ amenityLabel(slot) }}</div>
                          <div class="slot-type">{{ sessionLocation(slot) }}</div>
                        </div>
                        <span class="slot-badge" [class.slot-badge--red]="isFull(slot)" [class.slot-badge--green]="isBooked(slot)">
                          {{ badgeLabel(slot) }}
                        </span>
                      </div>

                      <div class="slot-time">{{ slot.startTime }} - {{ slot.endTime }}</div>
                      <div class="slot-state-row">
                        @if (slot.hostName) {
                          <span class="state-chip state-chip--hosted">Hosted session</span>
                          <span class="state-text">
                            @if (isBooked(slot) && slot.tenantName === slot.hostName) {
                              You are hosting this session
                            } @else {
                              Host: <strong>{{ slot.hostName }}</strong>
                            }
                          </span>
                        } @else if (isBooked(slot)) {
                          <span class="state-chip state-chip--private">Private session</span>
                          <span class="state-text">Reserved for you</span>
                        } @else if (isOccupied(slot) || isFull(slot)) {
                          <span class="state-chip state-chip--private">Private session</span>
                          <span class="state-text">
                            @if (slot.bookedByName) {
                              Booked by <strong>{{ slot.bookedByName }}</strong>
                            } @else {
                              Someone already took this slot
                            }
                          </span>
                        } @else {
                          <span class="state-chip">No host yet</span>
                          <span class="state-text">Book privately or host a joinable session</span>
                        }
                      </div>

                      <div class="slot-meta">
                        <div class="slot-capacity">
                          <span>Players</span>
                          <strong>{{ slot.bookingCount || 0 }}/{{ slot.capacity }}</strong>
                        </div>
                        @if (showHost(slot)) {
                          <div class="slot-host">
                            @if (isBooked(slot) && slot.tenantName === slot.hostName) {
                              You are hosting this session
                            } @else {
                              Host: <strong>{{ slot.hostName }}</strong>
                            }
                          </div>
                        } @else if (!isBooked(slot) && slot.bookedByName) {
                          <div class="slot-host">
                            Booked by <strong>{{ slot.bookedByName }}</strong>
                          </div>
                        }
                        <div class="slot-note" [class.slot-note--red]="isFull(slot)">
                          @if (isFull(slot)) {
                            This session is already full.
                          } @else if (isBooked(slot)) {
                            Your place in this session is confirmed.
                          } @else if (canJoinHost(slot)) {
                            Hosted by {{ slot.hostName }}. You can join directly.
                          } @else if (isOccupied(slot)) {
                            This time is already being used{{ slot.bookedByName ? ' by ' + slot.bookedByName : '' }} as a private session.
                          } @else {
                            No host yet. Start the session yourself or reserve it privately.
                          }
                        </div>
                      </div>

                      <div class="slot-actions">
                        @if (isBooked(slot)) {
                          <button class="btn btn--ghost" type="button" (click)="runCancel(slot)">
                            <mat-icon>event_busy</mat-icon>
                            <span>Cancel</span>
                          </button>
                        } @else if (canJoinHost(slot) && !isFull(slot)) {
                          <button class="btn btn--primary" type="button" (click)="runJoin(slot)">
                            <mat-icon>group_add</mat-icon>
                            <span>Join host</span>
                          </button>
                        } @else if (isFull(slot)) {
                          <button class="btn btn--danger" type="button" disabled>
                            <mat-icon>block</mat-icon>
                            <span>Full</span>
                          </button>
                        } @else {
                          <button class="btn btn--primary" type="button" (click)="runBook(slot)">
                            <mat-icon>event</mat-icon>
                            <span>Book slot</span>
                          </button>
                          <button class="btn btn--ghost" type="button" (click)="runOpenInvite(slot)">
                            <mat-icon>groups</mat-icon>
                            <span>Host session</span>
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
      </div>
    }
  `,
  styles: [`
    .board { display: flex; flex-direction: column; gap: 22px; }
    .lane {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 18px;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0.008));
    }
    .lane-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: end;
      flex-wrap: wrap;
    }
    .lane-title { font-size: 18px; font-weight: 800; }
    .lane-subtitle, .lane-meta { color: var(--text-muted); font-size: 12px; }
    .day-strip { display: flex; flex-direction: column; gap: 12px; }
    .day-head {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 12px;
      padding-bottom: 4px;
    }
    .day-name { font-size: 18px; font-weight: 700; }
    .day-date { font-size: 12px; color: var(--text-muted); }
    .slot-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .slot-card {
      border: 1px solid var(--border);
      border-radius: 16px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.015));
      padding: 16px;
      display: grid;
      gap: 14px;
      min-width: 0;
      transition: border-color 140ms ease, transform 140ms ease, background 140ms ease;
    }
    .slot-card:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.16); }
    .slot-card--full {
      border-color: rgba(248,113,113,0.45);
      background:
        linear-gradient(180deg, rgba(127,29,29,0.32), rgba(69,10,10,0.18)),
        linear-gradient(135deg, rgba(248,113,113,0.12), transparent 48%);
    }
    .slot-card--booked {
      border-color: rgba(34,197,94,0.35);
      background:
        linear-gradient(180deg, rgba(20,83,45,0.28), rgba(5,46,22,0.14)),
        linear-gradient(135deg, rgba(34,197,94,0.08), transparent 48%);
    }
    .slot-card--invite {
      border-color: rgba(96,165,250,0.35);
      background:
        linear-gradient(180deg, rgba(30,58,138,0.24), rgba(23,37,84,0.1)),
        linear-gradient(135deg, rgba(96,165,250,0.08), transparent 48%);
    }
    .slot-card--occupied {
      border-color: rgba(251,191,36,0.3);
      background:
        linear-gradient(180deg, rgba(120,53,15,0.2), rgba(69,26,3,0.08)),
        linear-gradient(135deg, rgba(251,191,36,0.08), transparent 48%);
    }
    .slot-card--machine { min-height: 0; }
    .slot-top {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 10px;
    }
    .slot-facility { font-size: 15px; font-weight: 700; }
    .slot-type { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .slot-badge {
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .slot-badge--red { background: rgba(248,113,113,0.14); color: #fca5a5; }
    .slot-badge--green { background: rgba(34,197,94,0.14); color: #86efac; }
    .slot-time {
      font-family: var(--font-mono);
      font-size: 24px;
      line-height: 1;
      letter-spacing: -0.03em;
      font-weight: 800;
    }
    .slot-meta { display: grid; gap: 8px; }
    .slot-capacity {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--text-muted);
    }
    .slot-capacity strong {
      font-family: var(--font-mono);
      color: var(--text);
      font-size: 14px;
    }
    .slot-host {
      font-size: 12px;
      color: var(--text-muted);
    }
    .slot-host strong { color: var(--text); }
    .slot-occupant {
      font-size: 12px;
      color: var(--text-muted);
    }
    .slot-occupant strong { color: var(--text); }
    .slot-state-row {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .state-chip {
      padding: 5px 9px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .state-chip--hosted {
      background: rgba(96,165,250,0.14);
      color: #bfdbfe;
    }
    .state-chip--private {
      background: rgba(251,191,36,0.16);
      color: #fde68a;
    }
    .state-text {
      font-size: 12px;
      color: var(--text-muted);
    }
    .state-text strong { color: var(--text); }
    .slot-note {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .slot-note--red { color: #fca5a5; }
    .slot-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
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
      border-color: rgba(96,165,250,0.4);
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
    .btn:disabled { cursor: not-allowed; opacity: 1; }
    .state {
      min-height: 180px;
      display: grid;
      place-items: center;
      gap: 10px;
      padding: 28px;
      color: var(--text-muted);
      text-align: center;
    }
    @media (max-width: 1100px) {
      .slot-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .slot-grid { grid-template-columns: 1fr; }
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

  exclusiveRows = computed(() => this.rows().filter(row => !this.supportsInvite(row)));
  sharedRows = computed(() => this.rows().filter(row => this.supportsInvite(row)));

  exclusiveGroups = computed(() => this.groupRows(this.exclusiveRows()));
  sharedGroups = computed(() => this.groupRows(this.sharedRows()));
  exclusiveCount = computed(() => this.exclusiveRows().length);
  sharedCount = computed(() => this.sharedRows().length);

  private groupRows(rows: AmenityBooking[]) {
    const groups = new Map<string, AmenityBooking[]>();
    for (const row of rows) {
      const key = row.slotDate || 'unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    return [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) =>
          `${a.startTime}-${a.facilityName || a.amenityType}-${a.resourceName || ''}`.localeCompare(`${b.startTime}-${b.facilityName || b.amenityType}-${b.resourceName || ''}`)
        )
      }));
  }

  isBooked(slot: AmenityBooking): boolean {
    return Number(slot.bookingId || 0) > 0;
  }

  isFull(slot: AmenityBooking): boolean {
    return !this.isBooked(slot) && Number(slot.bookingCount || 0) >= Number(slot.capacity || 0);
  }

  isInvite(slot: AmenityBooking): boolean {
    return !this.isBooked(slot) && !!slot.openInvite;
  }

  isOccupied(slot: AmenityBooking): boolean {
    return !this.isBooked(slot) && Number(slot.bookingCount || 0) > 0 && !this.isFull(slot);
  }

  canJoinHost(slot: AmenityBooking): boolean {
    return this.supportsInvite(slot) && !this.isBooked(slot) && (!!slot.joinable || (!!slot.hostName && !!slot.openInvite));
  }

  badgeLabel(slot: AmenityBooking): string {
    if (this.isBooked(slot)) return 'Your booking';
    if (this.isFull(slot)) return 'Occupied';
    if (this.canJoinHost(slot)) return 'Joinable';
    if (this.isOccupied(slot)) return 'In use';
    return 'Free';
  }

  amenityLabel(slot: AmenityBooking): string {
    return String(slot.amenityType || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  }

  sessionLocation(slot: AmenityBooking): string {
    if (slot.resourceName && slot.facilityName) return `${slot.resourceName} · ${slot.facilityName}`;
    return slot.facilityName || slot.resourceName || 'Shared facility';
  }

  supportsInvite(slot: AmenityBooking): boolean {
    return slot.amenityType !== 'WASHING_MACHINE';
  }

  showHost(slot: AmenityBooking): boolean {
    return this.canJoinHost(slot) && !!slot.hostName;
  }

  trackSlot(slot: AmenityBooking): string {
    return String(slot.bookingId || `${slot.slotId}-${slot.startTime}-${slot.endTime}`);
  }

  runBook(slot: AmenityBooking) { this.book()(slot); }
  runOpenInvite(slot: AmenityBooking) { this.openInvite()(slot); }
  runJoin(slot: AmenityBooking) { this.joinInvite()(slot); }
  runCancel(slot: AmenityBooking) { this.cancel()(slot); }
}
