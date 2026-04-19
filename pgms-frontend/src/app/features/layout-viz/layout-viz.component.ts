import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PG, Room, RoomStatus, SharingType } from '../../core/models';
import { RoomDetailDrawerComponent } from './room-detail-drawer.component';

type StatusFilter = 'ALL' | RoomStatus;
type ACFilter = 'ALL' | 'AC' | 'NON_AC';

@Component({
    selector: 'app-layout-viz',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatIconModule, MatTooltipModule, MatChipsModule,
        MatSelectModule, MatFormFieldModule, MatSlideToggleModule,
        RoomDetailDrawerComponent
    ],
    template: `
  <section class="layout fade-up" data-testid="layout-viz">
    <!-- Header -->
    <header class="head">
      <div>
        <div class="crumb">Layout Visualization</div>
        <h1>{{ activePg()?.name || 'Loading…' }}</h1>
        <p class="sub">{{ activePg()?.address }} · {{ activePg()?.totalFloors }} floors · {{ rooms().length }} rooms</p>
      </div>

      <div class="pg-switch" *ngIf="pgs().length > 1">
        @for (pg of pgs(); track pg.id) {
          <button class="pg-chip" [class.active]="pg.id === activePgId()"
                  (click)="selectPg(pg.id)"
                  [attr.data-testid]="'pg-chip-' + pg.id">
            <mat-icon>domain</mat-icon>
            <span>{{ pg.name }}</span>
            <span class="pg-count">{{ pg.occupiedCount }}/{{ pg.vacantCount + pg.occupiedCount + pg.vacatingCount }}</span>
          </button>
        }
      </div>
    </header>

    <!-- KPI strip -->
    <div class="kpi-strip">
      <div class="kpi" data-testid="kpi-occupancy">
        <div class="kpi-label">Occupancy</div>
        <div class="kpi-value">
          <span class="num">{{ occupancyRate() }}<small>%</small></span>
          <div class="bar"><div class="fill" [style.width.%]="occupancyRate()"></div></div>
        </div>
      </div>
      <div class="kpi" data-testid="kpi-vacant">
        <div class="kpi-label">Vacant rooms</div>
        <div class="kpi-value big vacant">{{ count('VACANT') }}</div>
      </div>
      <div class="kpi" data-testid="kpi-occupied">
        <div class="kpi-label">Occupied</div>
        <div class="kpi-value big occupied">{{ count('OCCUPIED') }}</div>
      </div>
      <div class="kpi" data-testid="kpi-vacating">
        <div class="kpi-label">Vacating</div>
        <div class="kpi-value big vacating">{{ count('VACATING') }}</div>
      </div>
      <div class="kpi" data-testid="kpi-subletting">
        <div class="kpi-label">Subletting</div>
        <div class="kpi-value big subletting">{{ count('SUBLETTING') }}</div>
      </div>
    </div>

    <!-- Body: mini-map + canvas -->
    <div class="body">
      <!-- Floor rail -->
      <aside class="floor-rail" data-testid="floor-rail">
        <div class="rail-title">Floors</div>
        <button class="floor-btn" [class.active]="floorFilter() === null"
                (click)="setFloor(null)"
                data-testid="floor-btn-all">
          <span class="label">All floors</span>
          <span class="count">{{ rooms().length }}</span>
        </button>
        @for (f of floorList(); track f) {
          <button class="floor-btn" [class.active]="floorFilter() === f"
                  (click)="setFloor(f)"
                  [attr.data-testid]="'floor-btn-' + f">
            <div class="floor-viz">
              @for (r of floorRooms(f); track r.id) {
                <span class="mini-cell" [class]="'s-' + r.status.toLowerCase()"
                      [matTooltip]="r.roomNumber + ' · ' + r.status" matTooltipPosition="right"></span>
              }
            </div>
            <span class="label">Floor {{ f }}</span>
            <span class="count">{{ floorRooms(f).length }}</span>
          </button>
        }
        <div class="legend" data-testid="legend">
          <div class="rail-title">Legend</div>
          <div class="lg"><span class="dot s-vacant"></span>Vacant</div>
          <div class="lg"><span class="dot s-occupied"></span>Occupied</div>
          <div class="lg"><span class="dot s-vacating"></span>Vacating</div>
          <div class="lg"><span class="dot s-subletting"></span>Subletting</div>
        </div>
      </aside>

      <!-- Canvas -->
      <div class="canvas-wrap">
        <div class="toolbar">
          <div class="filters">
            <button class="filter-chip" *ngFor="let opt of statusOpts"
                    [class.active]="statusFilter() === opt.v"
                    (click)="setStatusFilter(opt.v)"
                    [attr.data-testid]="'filter-status-' + opt.v">
              <span class="dot s-{{ opt.v.toLowerCase() }}" *ngIf="opt.v !== 'ALL'"></span>
              {{ opt.label }}
              <span class="mini-count">{{ opt.v === 'ALL' ? rooms().length : count(opt.v) }}</span>
            </button>
          </div>

          <div class="filters right">
            <button class="filter-chip" *ngFor="let opt of acOpts"
                    [class.active]="acFilter() === opt.v"
                    (click)="setAcFilter(opt.v)"
                    [attr.data-testid]="'filter-ac-' + opt.v">
              <mat-icon>{{ opt.icon }}</mat-icon>{{ opt.label }}
            </button>
            <button class="filter-chip" *ngFor="let opt of sharingOpts"
                    [class.active]="sharingFilter() === opt.v"
                    (click)="setSharingFilter(opt.v)"
                    [attr.data-testid]="'filter-sharing-' + opt.v">
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="canvas bg-grid" data-testid="rooms-canvas">
          @if (loading()) {
            <div class="state">
              <div class="spinner"></div>
              <p>Loading building…</p>
            </div>
          } @else if (filteredFloors().length === 0) {
            <div class="state">
              <mat-icon>sentiment_dissatisfied</mat-icon>
              <p>No rooms match the current filters.</p>
              <button class="btn" (click)="clearFilters()" data-testid="clear-filters">Clear filters</button>
            </div>
          } @else {
            @for (fl of filteredFloors(); track fl.floor) {
              <div class="floor-block">
                <div class="floor-head">
                  <div class="floor-label">
                    <mat-icon>layers</mat-icon>
                    <span>Floor {{ fl.floor }}</span>
                  </div>
                  <div class="floor-meta">
                    {{ fl.rooms.length }} rooms · {{ floorOccupiedRate(fl.floor) }}% occupied
                  </div>
                </div>

                <div class="rooms-grid">
                  @for (r of fl.rooms; track r.id) {
                    <button class="room"
                            [class]="'room--' + r.status.toLowerCase()"
                            (click)="openRoom(r)"
                            [matTooltip]="tooltip(r)"
                            matTooltipPosition="above"
                            [attr.data-testid]="'room-card-' + r.roomNumber">
                      <div class="room-head">
                        <span class="room-num">{{ r.roomNumber }}</span>
                        <span class="room-ac" *ngIf="r.isAC" matTooltip="Air-conditioned">
                          <mat-icon>ac_unit</mat-icon>
                        </span>
                      </div>
                      <div class="room-mid">
                        <span class="pill dot pill--{{ r.status.toLowerCase() }}">{{ r.status }}</span>
                      </div>
                      <div class="room-foot">
                        <div class="room-sharing">{{ r.sharingType }}</div>
                        <div class="room-rent">₹{{ r.monthlyRent | number:'1.0-0' }}</div>
                      </div>
                      <div class="occupants" *ngIf="r.occupants?.length">
                        @for (o of r.occupants!.slice(0, 3); track o.userId) {
                          <span class="avatar" [style.background]="avatarColor(o.name)">{{ initials(o.name) }}</span>
                        }
                        <span class="avatar more" *ngIf="(r.occupants?.length ?? 0) > 3">+{{ (r.occupants?.length ?? 0) - 3 }}</span>
                      </div>
                    </button>
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>

    <app-room-detail-drawer
      [room]="selectedRoom()"
      [canEdit]="canEdit()"
      (closed)="selectedRoom.set(null)"
      (updated)="onRoomUpdated($event)" />
  </section>
  `,
    styles: [`
    :host { display: block; }
    .layout { display: flex; flex-direction: column; gap: 20px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .crumb { font-size: 11px; letter-spacing: 0.14em; color: var(--primary); text-transform: uppercase; font-weight: 700; }
    h1 { margin: 6px 0 2px; font-size: 30px; letter-spacing: -0.02em; }
    .sub { margin: 0; color: var(--text-muted); font-size: 13px; }

    .pg-switch { display: flex; gap: 8px; flex-wrap: wrap; }
    .pg-chip { display: inline-flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 10px; font-size: 12px; cursor: pointer; transition: border-color 140ms ease, background 140ms ease; }
    .pg-chip:hover { border-color: var(--border-soft); }
    .pg-chip.active { background: rgba(52,211,153,0.1); border-color: var(--primary); color: var(--primary); }
    .pg-chip mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .pg-count { margin-left: 4px; font-family: var(--font-mono); font-size: 11px; color: var(--text-dim); }
    .pg-chip.active .pg-count { color: var(--primary); }

    .kpi-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
    @media (max-width: 960px) { .kpi-strip { grid-template-columns: repeat(2, 1fr); } }
    .kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; }
    .kpi-label { font-size: 11px; letter-spacing: 0.12em; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
    .kpi-value { font-size: 16px; font-weight: 600; }
    .kpi-value.big { font-size: 28px; }
    .kpi-value .num { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
    .kpi-value .num small { font-size: 14px; color: var(--text-muted); font-weight: 500; margin-left: 3px; }
    .kpi-value.vacant { color: var(--status-vacant-text); }
    .kpi-value.occupied { color: var(--status-occupied-text); }
    .kpi-value.vacating { color: var(--status-vacating-text); }
    .kpi-value.subletting { color: var(--status-subletting-text); }
    .bar { height: 4px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; }
    .fill { height: 100%; background: linear-gradient(90deg, var(--primary), #10b981); transition: width 400ms ease; }

    .body { display: grid; grid-template-columns: 220px 1fr; gap: 20px; min-height: 540px; }
    @media (max-width: 960px) { .body { grid-template-columns: 1fr; } }

    .floor-rail { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 6px; height: fit-content; position: sticky; top: 16px; }
    .rail-title { font-size: 11px; letter-spacing: 0.14em; color: var(--text-dim); text-transform: uppercase; font-weight: 600; padding: 6px 6px 10px; }
    .floor-btn { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 6px; padding: 10px 10px; border-radius: 10px; background: transparent; border: 1px solid transparent; color: var(--text-muted); cursor: pointer; text-align: left; transition: background 140ms ease, color 140ms ease; }
    .floor-btn:hover { background: rgba(255,255,255,0.03); color: var(--text); }
    .floor-btn.active { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.3); color: var(--text); }
    .floor-btn .label { font-size: 13px; font-weight: 500; }
    .floor-btn .count { font-family: var(--font-mono); font-size: 11px; color: var(--text-dim); }
    .floor-viz { grid-column: 1 / -1; display: flex; gap: 2px; margin-bottom: 6px; }
    .mini-cell { flex: 1; height: 10px; border-radius: 2px; }
    .mini-cell.s-vacant { background: var(--status-vacant-border); }
    .mini-cell.s-occupied { background: var(--status-occupied-border); }
    .mini-cell.s-vacating { background: var(--status-vacating-border); }
    .mini-cell.s-subletting { background: var(--status-subletting-border); }

    .legend { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
    .lg { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); padding: 0 6px; }
    .lg .dot { width: 10px; height: 10px; border-radius: 3px; }
    .dot.s-vacant { background: var(--status-vacant-text); }
    .dot.s-occupied { background: var(--status-occupied-text); }
    .dot.s-vacating { background: var(--status-vacating-text); }
    .dot.s-subletting { background: var(--status-subletting-text); }

    .canvas-wrap { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .filters { display: flex; gap: 8px; flex-wrap: wrap; }
    .filters.right { justify-content: flex-end; }
    .filter-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--surface); border: 1px solid var(--border); color: var(--text-muted); padding: 7px 12px; border-radius: 999px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 140ms ease; }
    .filter-chip:hover { color: var(--text); border-color: var(--border-soft); }
    .filter-chip.active { background: rgba(52,211,153,0.1); border-color: var(--primary); color: var(--primary); }
    .filter-chip .dot { width: 8px; height: 8px; border-radius: 50%; }
    .filter-chip mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .mini-count { margin-left: 4px; font-family: var(--font-mono); font-size: 11px; color: var(--text-dim); }
    .filter-chip.active .mini-count { color: var(--primary); }

    .canvas { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 24px; display: flex; flex-direction: column; gap: 28px; min-height: 500px; position: relative; }

    .floor-block { display: flex; flex-direction: column; gap: 12px; }
    .floor-head { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px dashed var(--border); }
    .floor-label { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; }
    .floor-label mat-icon { color: var(--primary); font-size: 18px; width: 18px; height: 18px; }
    .floor-meta { font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); }

    .rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
    .room { display: flex; flex-direction: column; gap: 10px; text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px; cursor: pointer; transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease; font-family: inherit; color: var(--text); position: relative; overflow: hidden; }
    .room::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: currentColor; opacity: 0.8; }
    .room:hover { transform: translateY(-2px); border-color: var(--border-soft); box-shadow: 0 12px 32px -16px rgba(0,0,0,0.6); }
    .room--vacant { color: var(--status-vacant-text); background: linear-gradient(180deg, var(--status-vacant-bg), var(--surface) 60%); border-color: var(--status-vacant-border); }
    .room--occupied { color: var(--status-occupied-text); background: linear-gradient(180deg, var(--status-occupied-bg), var(--surface) 60%); border-color: var(--status-occupied-border); }
    .room--vacating { color: var(--status-vacating-text); background: linear-gradient(180deg, var(--status-vacating-bg), var(--surface) 60%); border-color: var(--status-vacating-border); }
    .room--subletting { color: var(--status-subletting-text); background: linear-gradient(180deg, var(--status-subletting-bg), var(--surface) 60%); border-color: var(--status-subletting-border); }
    .room-head { display: flex; justify-content: space-between; align-items: center; }
    .room-num { font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--text); letter-spacing: 0.02em; }
    .room-ac { color: var(--text-muted); }
    .room-ac mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .room-mid { }
    .room-foot { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.06); }
    .room-sharing { font-size: 11px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; }
    .room-rent { font-size: 13px; font-weight: 600; color: var(--text); font-family: var(--font-mono); }
    .occupants { display: flex; align-items: center; margin-top: -2px; }
    .occupants .avatar { width: 22px; height: 22px; border-radius: 50%; font-size: 10px; font-weight: 700; display: grid; place-items: center; color: white; margin-left: -6px; border: 2px solid var(--surface); }
    .occupants .avatar:first-child { margin-left: 0; }
    .occupants .avatar.more { background: var(--bg-elev); color: var(--text-muted); }

    .state { flex: 1; display: grid; place-items: center; text-align: center; color: var(--text-muted); gap: 12px; padding: 48px; }
    .state mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--text-dim); }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.9s linear infinite; margin-bottom: 4px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LayoutVizComponent {
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private route = inject(ActivatedRoute);
    private snack = inject(MatSnackBar);

    pgs = signal<PG[]>([]);
    rooms = signal<Room[]>([]);
    activePgId = signal<number | null>(null);
    loading = signal(true);

    statusFilter = signal<StatusFilter>('ALL');
    acFilter = signal<ACFilter>('ALL');
    sharingFilter = signal<'ALL' | SharingType>('ALL');
    floorFilter = signal<number | null>(null);
    selectedRoom = signal<Room | null>(null);

    statusOpts: { v: StatusFilter; label: string }[] = [
        { v: 'ALL', label: 'All' },
        { v: 'VACANT', label: 'Vacant' },
        { v: 'OCCUPIED', label: 'Occupied' },
        { v: 'VACATING', label: 'Vacating' },
        { v: 'SUBLETTING', label: 'Subletting' }
    ];
    acOpts: { v: ACFilter; label: string; icon: string }[] = [
        { v: 'ALL', label: 'Any', icon: 'filter_list' },
        { v: 'AC', label: 'AC', icon: 'ac_unit' },
        { v: 'NON_AC', label: 'Non-AC', icon: 'air' }
    ];
    sharingOpts: { v: 'ALL' | SharingType; label: string }[] = [
        { v: 'ALL', label: 'All sharing' },
        { v: 'SINGLE', label: 'Single' },
        { v: 'DOUBLE', label: 'Double' },
        { v: 'TRIPLE', label: 'Triple' },
        { v: 'DORM', label: 'Dorm' }
    ];

    activePg = computed(() => this.pgs().find(p => p.id === this.activePgId()) ?? null);

    canEdit = computed(() => {
        const r = this.auth.role();
        return r === 'MANAGER';
    });

    constructor() {
        effect(() => {
            const pgId = this.activePgId();
            if (pgId !== null) this.loadRooms(pgId);
        });

        this.route.paramMap.subscribe(params => {
            const p = params.get('pgId');
            if (p) this.activePgId.set(+p);
        });

        this.loadPgs();
    }

    private loadPgs() {
        this.api.listPgs().subscribe({
            next: pgs => {
                this.pgs.set(pgs);
                if (this.activePgId() === null && pgs.length) this.activePgId.set(pgs[0].id);
                if (!pgs.length) this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.snack.open('Failed to load PGs', 'Dismiss', { duration: 3000 });
            }
        });
    }

    private loadRooms(pgId: number) {
        this.loading.set(true);
        this.api.listRooms(pgId).subscribe({
            next: rooms => { this.rooms.set(rooms); this.loading.set(false); },
            error: () => { this.loading.set(false); this.snack.open('Failed to load rooms', 'Dismiss', { duration: 3000 }); }
        });
    }

    selectPg(id: number) { this.activePgId.set(id); this.floorFilter.set(null); this.selectedRoom.set(null); }
    setFloor(f: number | null) { this.floorFilter.set(f); }
    setStatusFilter(s: StatusFilter) { this.statusFilter.set(s); }
    setAcFilter(a: ACFilter) { this.acFilter.set(a); }
    setSharingFilter(s: 'ALL' | SharingType) { this.sharingFilter.set(s); }
    clearFilters() {
        this.statusFilter.set('ALL'); this.acFilter.set('ALL'); this.sharingFilter.set('ALL'); this.floorFilter.set(null);
    }

    floorList = computed(() => {
        const set = new Set(this.rooms().map(r => r.floor));
        return Array.from(set).sort((a, b) => a - b);
    });

    floorRooms(f: number): Room[] {
        return this.rooms().filter(r => r.floor === f);
    }

    filteredRooms = computed(() => {
        const s = this.statusFilter(), a = this.acFilter(), sh = this.sharingFilter(), fl = this.floorFilter();
        return this.rooms().filter(r =>
            (s === 'ALL' || r.status === s) &&
            (a === 'ALL' || (a === 'AC' ? r.isAC : !r.isAC)) &&
            (sh === 'ALL' || r.sharingType === sh) &&
            (fl === null || r.floor === fl)
        );
    });

    filteredFloors = computed(() => {
        const byFloor = new Map<number, Room[]>();
        for (const r of this.filteredRooms()) {
            if (!byFloor.has(r.floor)) byFloor.set(r.floor, []);
            byFloor.get(r.floor)!.push(r);
        }
        return Array.from(byFloor.entries())
            .sort((a, b) => b[0] - a[0])
            .map(([floor, rooms]) => ({ floor, rooms: rooms.sort((x, y) => x.roomNumber.localeCompare(y.roomNumber)) }));
    });

    count(s: RoomStatus): number { return this.rooms().filter(r => r.status === s).length; }

    occupancyRate = computed(() => {
        const total = this.rooms().length;
        if (!total) return 0;
        const occ = this.rooms().filter(r => r.status === 'OCCUPIED' || r.status === 'SUBLETTING' || r.status === 'VACATING').length;
        return Math.round((occ / total) * 100);
    });

    floorOccupiedRate(f: number): number {
        const list = this.floorRooms(f);
        if (!list.length) return 0;
        const occ = list.filter(r => r.status === 'OCCUPIED' || r.status === 'SUBLETTING' || r.status === 'VACATING').length;
        return Math.round((occ / list.length) * 100);
    }

    openRoom(r: Room) { this.selectedRoom.set(r); }

    onRoomUpdated(updated: Room) {
        const list = this.rooms().map(r => r.id === updated.id ? { ...r, ...updated } : r);
        this.rooms.set(list);
        this.selectedRoom.set(null);
        this.snack.open(`Room ${updated.roomNumber} updated`, 'OK', { duration: 2500, panelClass: 'pgms-snack' });
    }

    tooltip(r: Room): string {
        const occ = r.occupants?.length ? ` · ${r.occupants.length} tenant(s)` : '';
        return `${r.roomNumber} · ${r.sharingType} · ${r.isAC ? 'AC' : 'Non-AC'} · ₹${r.monthlyRent}/mo${occ}`;
    }

    initials(name: string): string {
        return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    }

    avatarColor(name: string): string {
        const colors = ['linear-gradient(135deg,#818cf8,#6366f1)', 'linear-gradient(135deg,#34d399,#10b981)', 'linear-gradient(135deg,#f472b6,#db2777)', 'linear-gradient(135deg,#fbbf24,#d97706)', 'linear-gradient(135deg,#a78bfa,#7c3aed)', 'linear-gradient(135deg,#60a5fa,#2563eb)'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
        return colors[hash % colors.length];
    }
}
