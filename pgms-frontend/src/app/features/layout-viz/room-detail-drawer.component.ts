import { Component, EventEmitter, Input, Output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ApiService } from '../../core/api.service';
import { CleaningStatus, Room } from '../../core/models';

@Component({
    selector: 'app-room-detail-drawer',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, MatSelectModule, MatFormFieldModule],
    template: `
  @if (room) {
    <div class="backdrop" (click)="close()"></div>
    <aside class="drawer fade-up" data-testid="room-detail-drawer">
      <header>
        <div>
          <div class="eyebrow">Room detail</div>
          <h2>{{ room.roomNumber }}</h2>
          <div class="sub">Floor {{ room.floor }} · {{ room.sharingType }} · {{ room.isAC ? 'AC' : 'Non-AC' }}</div>
        </div>
        <button class="icon-btn" (click)="close()" aria-label="Close" data-testid="drawer-close">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <div class="block">
        <div class="block-title">Current status</div>
        <span class="pill dot pill--{{ room.status.toLowerCase() }}" data-testid="room-status-pill">{{ room.status }}</span>
      </div>

      @if (room.occupants && room.occupants.length > 0) {
        <div class="block">
          <div class="block-title">Occupants</div>
          <div class="occ-list">
            @for (o of room.occupants; track o.userId) {
              <div class="occ">
                <span class="avatar">{{ initials(o.name) }}</span>
                <div class="occ-meta">
                  <div class="name">{{ o.name }}</div>
                  <div class="mail">{{ o.email }}</div>
                </div>
                <span class="pill dot" [class.pill--vacating]="o.status === 'VACATING'" [class.pill--occupied]="o.status === 'ACTIVE'">
                  {{ o.status }}
                </span>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="block empty">
          <mat-icon>person_off</mat-icon>
          <div>No tenants currently assigned.</div>
        </div>
      }

      <div class="block">
        <div class="stat-grid">
          <div class="stat">
            <div class="stat-label">Monthly rent</div>
            <div class="stat-value">₹{{ room.monthlyRent | number:'1.0-0' }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Capacity</div>
            <div class="stat-value">{{ room.capacity || '-' }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Cleaning</div>
            <div class="stat-value stat-value--sm">{{ room.cleaningStatus || 'CLEAN' }}</div>
          </div>
        </div>
      </div>

      @if (canEdit) {
        <div class="block edit-block">
          <div class="block-title">Manager action</div>

          <label class="fld">
            <span>Cleaning status</span>
            <select [(ngModel)]="editCleaningStatus" name="cleaningStatus" data-testid="edit-cleaning-status">
              <option value="CLEAN">CLEAN</option>
              <option value="DIRTY">DIRTY</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
            </select>
          </label>

          <button class="btn btn--primary" (click)="save()" [disabled]="saving()" data-testid="drawer-save">
            {{ saving() ? 'Saving…' : 'Update cleaning status' }}
          </button>
        </div>
      }
    </aside>
  }
  `,
    styles: [`
    .backdrop { position: fixed; inset: 0; background: rgba(3,6,15,0.55); backdrop-filter: blur(4px); z-index: 40; animation: fade 200ms ease both; }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    .drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 420px; max-width: 96vw; background: var(--surface); border-left: 1px solid var(--border); z-index: 50; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; animation: slide 240ms cubic-bezier(.2,.7,.2,1) both; }
    @keyframes slide { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .eyebrow { font-size: 11px; letter-spacing: 0.14em; color: var(--primary); text-transform: uppercase; font-weight: 700; }
    h2 { margin: 6px 0 4px; font-size: 24px; letter-spacing: -0.01em; }
    .sub { color: var(--text-muted); font-size: 12px; }
    .icon-btn { background: transparent; border: 1px solid var(--border); color: var(--text-muted); padding: 6px; border-radius: 10px; cursor: pointer; display: grid; place-items: center; transition: border-color 140ms ease; }
    .icon-btn:hover { border-color: var(--border-soft); color: var(--text); }
    .block { display: flex; flex-direction: column; gap: 10px; padding: 16px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: 14px; }
    .block-title { font-size: 11px; letter-spacing: 0.12em; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
    .block.empty { flex-direction: row; align-items: center; gap: 10px; color: var(--text-muted); font-size: 13px; }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .stat-label { font-size: 11px; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }
    .stat-value { font-size: 22px; font-weight: 700; font-family: var(--font-mono); }
    .stat-value--sm { font-size: 16px; }
    .occ-list { display: flex; flex-direction: column; gap: 8px; }
    .occ { display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid var(--border); border-radius: 10px; }
    .avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg,#818cf8,#6366f1); color: white; display: grid; place-items: center; font-weight: 700; font-size: 12px; }
    .occ-meta { flex: 1; }
    .name { font-weight: 600; font-size: 13px; }
    .mail { font-size: 11px; color: var(--text-muted); }
    .fld { display: flex; flex-direction: column; gap: 6px; }
    .fld span { font-size: 12px; color: var(--text-muted); font-weight: 500; }
    .fld input, .fld select { background: var(--bg); border: 1px solid var(--border); color: var(--text); font-family: inherit; padding: 10px 12px; border-radius: 10px; font-size: 13px; outline: none; }
    .fld input:focus, .fld select:focus { border-color: var(--primary); }
    .edit-block button { margin-top: 6px; }
    .pill--active { background: var(--status-occupied-bg); color: var(--status-occupied-text); border-color: var(--status-occupied-border); }
  `]
})
export class RoomDetailDrawerComponent {
    private api = inject(ApiService);
    @Input() room: Room | null = null;
    @Input() canEdit = false;
    @Output() closed = new EventEmitter<void>();
    @Output() updated = new EventEmitter<Room>();

    editCleaningStatus: CleaningStatus = 'CLEAN';
    saving = signal(false);

    ngOnChanges() {
        if (this.room) {
            this.editCleaningStatus = this.room.cleaningStatus || 'CLEAN';
        }
    }

    close() { this.closed.emit(); }

    save() {
        if (!this.room) return;
        this.saving.set(true);
        this.api.updateRoomCleaningStatus(this.room.id, this.editCleaningStatus).subscribe({
            next: (r) => { this.saving.set(false); this.updated.emit(r); },
            error: () => { this.saving.set(false); }
        });
    }

    initials(name: string): string { return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(); }
}
