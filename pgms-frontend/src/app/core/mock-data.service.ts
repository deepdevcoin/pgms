import { Injectable } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';
import {
    LoginResponse, PG, Room, Tenant, Manager,
    OwnerSummary, ManagerSummary, RoomStatus, SharingType
} from './models';

@Injectable({ providedIn: 'root' })
export class MockDataService {
    private pgs: PG[];
    private rooms: Room[];
    private managers: Manager[];
    private tenants: Tenant[];

    constructor() {
        this.pgs = this.buildPgs();
        this.rooms = this.buildRooms();
        this.managers = this.buildManagers();
        this.tenants = this.buildTenants();
        this.recomputePgCounts();
    }

    // -------- Auth --------
    login(email: string, _password: string): Observable<LoginResponse> {
        const lower = email.toLowerCase();
        let role: 'OWNER' | 'MANAGER' | 'TENANT' = 'OWNER';
        let name = 'Riya Kapoor';
        let userId = 1;
        if (lower.includes('manager')) { role = 'MANAGER'; name = 'Arjun Nair'; userId = 2; }
        else if (lower.includes('tenant')) { role = 'TENANT'; name = 'Devika Rao'; userId = 3; }
        return of({
            token: 'demo.jwt.' + btoa(email),
            role, userId, name,
            isFirstLogin: false
        }).pipe(delay(350));
    }

    // -------- PGs / Rooms --------
    listPgs(): Observable<PG[]> { return of(this.clone(this.pgs)).pipe(delay(200)); }

    listRooms(pgId: number, opts?: { status?: RoomStatus; floor?: number }): Observable<Room[]> {
        let list = this.rooms.filter(r => r.pgId === pgId);
        if (opts?.status) list = list.filter(r => r.status === opts.status);
        if (opts?.floor !== undefined) list = list.filter(r => r.floor === opts.floor);
        const hydrated = list.map(r => this.hydrateRoom(r));
        return of(hydrated).pipe(delay(180));
    }

    updateRoom(id: number, patch: Partial<Room>): Observable<Room> {
        const idx = this.rooms.findIndex(r => r.id === id);
        if (idx < 0) return throwError(() => new Error('Room not found'));
        this.rooms[idx] = { ...this.rooms[idx], ...patch };
        this.syncTenantsForRoom(this.rooms[idx]);
        this.recomputePgCounts();
        return of(this.hydrateRoom(this.rooms[idx])).pipe(delay(120));
    }

    listManagers(): Observable<Manager[]> { return of(this.clone(this.managers)).pipe(delay(150)); }
    listTenants(): Observable<Tenant[]> { return of(this.clone(this.tenants)).pipe(delay(150)); }

    tenantProfile(): Observable<Tenant> {
        return of({ ...this.tenants[0], creditWalletBalance: 1200 }).pipe(delay(150));
    }

    ownerSummary(): Observable<OwnerSummary> {
        const totalRooms = this.rooms.length;
        const vacant = this.rooms.filter(r => r.status === 'VACANT').length;
        const active = this.tenants.filter(t => t.status === 'ACTIVE').length;
        const vacating = this.tenants.filter(t => t.status === 'VACATING').length;
        return of({
            totalPgs: this.pgs.length,
            totalRooms,
            totalVacantRooms: vacant,
            totalActiveTenants: active,
            totalVacatingTenants: vacating,
            totalRentCollectedThisMonth: 428500,
            totalRentPendingThisMonth: 92400,
            totalFinesOutstanding: 6700,
            openComplaints: 7,
            escalatedComplaints: 2,
            managerComplaints: 1,
            advanceRefundQueue: [
                { tenantName: 'Ishaan Verma', roomNumber: 'B-204', advanceRefundAmount: 14000 },
                { tenantName: 'Neha Sharma', roomNumber: 'A-102', advanceRefundAmount: 9000 }
            ]
        }).pipe(delay(180));
    }

    managerSummary(): Observable<ManagerSummary> {
        const pgId = this.pgs[0].id;
        const total = this.rooms.filter(r => r.pgId === pgId).length;
        const occ = this.rooms.filter(r => r.pgId === pgId && r.status !== 'VACANT').length;
        return of({
            occupancyRate: Math.round((occ / total) * 1000) / 10,
            totalRooms: total,
            occupiedRooms: occ,
            paymentCollectedThisMonth: 184200,
            paymentPendingThisMonth: 38600,
            openComplaints: 3,
            pendingServiceRequests: 4,
            vacateNotices: [
                { tenantName: 'Karan Mehta', intendedDate: '2026-03-05', refundEligible: true },
                { tenantName: 'Priya Singh', intendedDate: '2026-02-28', refundEligible: false }
            ]
        }).pipe(delay(180));
    }

    // -------- Seeders --------
    private buildPgs(): PG[] {
        return [
            { id: 1, name: 'Aurora Residency', address: 'HSR Layout, Bengaluru', totalFloors: 4, paymentDeadlineDay: 5, fineAmountPerDay: 100, slaHours: 48, vacantCount: 0, occupiedCount: 0, vacatingCount: 0 },
            { id: 2, name: 'Meridian House', address: 'Koramangala 5th Block', totalFloors: 5, paymentDeadlineDay: 10, fineAmountPerDay: 100, slaHours: 48, vacantCount: 0, occupiedCount: 0, vacatingCount: 0 },
            { id: 3, name: 'Cedar Stays', address: 'Indiranagar 100ft Rd', totalFloors: 3, paymentDeadlineDay: 7, fineAmountPerDay: 100, slaHours: 72, vacantCount: 0, occupiedCount: 0, vacatingCount: 0 }
        ];
    }

    private buildRooms(): Room[] {
        const rooms: Room[] = [];
        let id = 1;
        const sharings: SharingType[] = ['SINGLE', 'DOUBLE', 'TRIPLE', 'DORM'];
        const statusPool: RoomStatus[] = [
            'OCCUPIED', 'OCCUPIED', 'OCCUPIED', 'OCCUPIED', 'OCCUPIED',
            'VACANT', 'VACANT', 'VACATING', 'SUBLETTING'
        ];
        for (const pg of this.buildPgs()) {
            for (let f = 1; f <= pg.totalFloors; f++) {
                const perFloor = pg.id === 2 ? 7 : 6;
                for (let n = 1; n <= perFloor; n++) {
                    const sharing = sharings[(f + n) % sharings.length];
                    const isAC = (f * n) % 3 !== 0;
                    const status = statusPool[(pg.id * 3 + f * 5 + n * 7) % statusPool.length];
                    const baseRent = sharing === 'SINGLE' ? 14000 : sharing === 'DOUBLE' ? 10500 : sharing === 'TRIPLE' ? 8500 : 6500;
                    rooms.push({
                        id: id++,
                        pgId: pg.id,
                        roomNumber: `${String.fromCharCode(64 + f)}-${f}${n.toString().padStart(2, '0')}`,
                        floor: f,
                        isAC,
                        sharingType: sharing,
                        monthlyRent: baseRent + (isAC ? 1500 : 0),
                        status,
                        capacity: sharing === 'SINGLE' ? 1 : sharing === 'DOUBLE' ? 2 : sharing === 'TRIPLE' ? 3 : 6
                    });
                }
            }
        }
        return rooms;
    }

    private buildManagers(): Manager[] {
        return [
            { id: 101, name: 'Arjun Nair', email: 'arjun.manager@pgms.in', phone: '+91 98210 00001', designation: 'Operations Manager', assignedPgs: [{ id: 1, name: 'Aurora Residency' }], isActive: true },
            { id: 102, name: 'Shreya Patil', email: 'shreya.manager@pgms.in', phone: '+91 98210 00002', designation: 'Floor Supervisor', assignedPgs: [{ id: 2, name: 'Meridian House' }, { id: 3, name: 'Cedar Stays' }], isActive: true }
        ];
    }

    private buildTenants(): Tenant[] {
        const firstNames = [
            'Devika', 'Karan', 'Priya', 'Rahul', 'Sneha', 'Vikram',
            'Meera', 'Aditya', 'Nisha', 'Rohan', 'Tara', 'Yash',
            'Kavya', 'Arnav', 'Ishika', 'Manav', 'Neha', 'Ishaan',
            'Aarav', 'Ananya', 'Diya', 'Kabir', 'Mira', 'Reyansh'
        ];
        const lastNames = ['Rao', 'Mehta', 'Singh', 'Jain', 'Iyer', 'Shah', 'Pillai', 'Roy', 'Gupta', 'Desai', 'Sen', 'Bhatia', 'Menon', 'Kulkarni', 'Das', 'Khanna'];
        const occupiedRooms = this.rooms.filter(r => r.status === 'OCCUPIED' || r.status === 'VACATING' || r.status === 'SUBLETTING');
        const tenants: Tenant[] = [];
        let uid = 1000;
        occupiedRooms.forEach((r, i) => {
            const occupantCount = Math.max(1, Math.min(r.capacity ?? 1, r.sharingType === 'SINGLE' ? 1 : 2));
            for (let bed = 0; bed < occupantCount; bed++) {
                const nameIndex = (i * 2 + bed) % firstNames.length;
                const n = `${firstNames[nameIndex]} ${lastNames[(i + bed) % lastNames.length]}`;
                tenants.push({
                    userId: uid++,
                    name: n,
                    email: n.toLowerCase().replace(/\s+/g, '.') + '@pgms.in',
                    phone: '+91 9' + (810000000 + tenants.length),
                    roomId: r.id,
                    pgId: r.pgId,
                    joiningDate: '2025-' + (((i % 11) + 1).toString().padStart(2, '0')) + '-12',
                    advanceAmountPaid: 12000,
                    creditWalletBalance: tenants.length % 5 === 0 ? 1200 : 0,
                    status: r.status === 'VACATING' ? 'VACATING' : 'ACTIVE'
                });
            }
        });
        return tenants;
    }

    private recomputePgCounts() {
        for (const pg of this.pgs) {
            const list = this.rooms.filter(r => r.pgId === pg.id);
            pg.vacantCount = list.filter(r => r.status === 'VACANT').length;
            pg.occupiedCount = list.filter(r => r.status === 'OCCUPIED' || r.status === 'SUBLETTING').length;
            pg.vacatingCount = list.filter(r => r.status === 'VACATING').length;
        }
    }

    private hydrateRoom(room: Room): Room {
        const occupants = room.status === 'VACANT'
            ? []
            : this.tenants.filter(t => t.roomId === room.id && t.status !== 'ARCHIVED');
        return this.clone({ ...room, occupants });
    }

    private syncTenantsForRoom(room: Room) {
        if (room.status === 'VACANT') {
            this.tenants = this.tenants.map(t => t.roomId === room.id ? { ...t, status: 'ARCHIVED' } : t);
            return;
        }

        const existing = this.tenants.filter(t => t.roomId === room.id && t.status !== 'ARCHIVED');
        if (!existing.length) {
            const userId = Math.max(999, ...this.tenants.map(t => t.userId)) + 1;
            const name = `Tenant ${room.roomNumber}`;
            this.tenants.push({
                userId,
                name,
                email: name.toLowerCase().replace(/\s+/g, '.') + '@pgms.in',
                phone: '+91 9000000000',
                roomId: room.id,
                pgId: room.pgId,
                joiningDate: new Date().toISOString().slice(0, 10),
                advanceAmountPaid: 12000,
                creditWalletBalance: 0,
                status: room.status === 'VACATING' ? 'VACATING' : 'ACTIVE'
            });
            return;
        }

        this.tenants = this.tenants.map(t => t.roomId === room.id && t.status !== 'ARCHIVED'
            ? { ...t, status: room.status === 'VACATING' ? 'VACATING' : 'ACTIVE' }
            : t
        );
    }

    private clone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value)) as T;
    }
}
