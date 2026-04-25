import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import {
  AmenityBooking, Complaint, LoginResponse, Manager, ManagerSummary, MenuItem, Notice,
  NoticeReadReceipt, OwnerSummary, PG, RentRecord, Role, Room, RoomStatus, SharingType,
  Tenant
} from './models';

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private pgs: PG[];
  private rooms: Room[];
  private managers: Manager[];
  private tenants: Tenant[];
  private payments: RentRecord[];
  private complaints: Complaint[];
  private notices: Notice[];
  private noticeReceiptsById: Record<number, NoticeReadReceipt[]>;
  private menu: MenuItem[];
  private amenities: AmenityBooking[];

  constructor() {
    this.pgs = this.buildPgs();
    this.rooms = this.buildRooms();
    this.managers = this.buildManagers();
    this.tenants = this.buildTenants();
    this.payments = this.buildPayments();
    this.complaints = this.buildComplaints();
    this.notices = this.buildNotices();
    this.noticeReceiptsById = this.buildNoticeReceipts();
    this.menu = this.buildMenu();
    this.amenities = this.buildAmenities();
    this.recomputePgCounts();
  }

  login(email: string, _password: string): Observable<LoginResponse> {
    const lower = email.toLowerCase();
    let role: Role = 'OWNER';
    let name = 'Riya Kapoor';
    let userId = 1;
    if (lower.includes('manager')) { role = 'MANAGER'; name = 'Arjun Nair'; userId = 2; }
    else if (lower.includes('tenant')) { role = 'TENANT'; name = 'Devika Rao'; userId = 3; }
    return of({ token: 'demo.jwt.' + btoa(email), role, userId, name, isFirstLogin: false }).pipe(delay(250));
  }

  listPgs(): Observable<PG[]> { return of(this.clone(this.pgs)).pipe(delay(120)); }
  listManagers(): Observable<Manager[]> { return of(this.clone(this.managers)).pipe(delay(120)); }
  listTenants(): Observable<Tenant[]> { return of(this.clone(this.tenants)).pipe(delay(120)); }
  tenantProfile(): Observable<Tenant> { return of({ ...this.tenants[0], creditWalletBalance: 1200 }).pipe(delay(120)); }

  listRooms(pgId: number, opts?: { status?: RoomStatus; floor?: number }): Observable<Room[]> {
    let list = this.rooms.filter(r => r.pgId === pgId);
    if (opts?.status) list = list.filter(r => r.status === opts.status);
    if (opts?.floor !== undefined) list = list.filter(r => r.floor === opts.floor);
    return of(list.map(room => this.hydrateRoom(room))).pipe(delay(120));
  }

  updateRoom(id: number, patch: Partial<Room>): Observable<Room> {
    const index = this.rooms.findIndex(room => room.id === id);
    if (index < 0) return throwError(() => new Error('Room not found'));
    this.rooms[index] = { ...this.rooms[index], ...patch };
    this.syncTenantsForRoom(this.rooms[index]);
    this.recomputePgCounts();
    return of(this.hydrateRoom(this.rooms[index])).pipe(delay(120));
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
    }).pipe(delay(150));
  }

  managerSummary(): Observable<ManagerSummary> {
    const pgId = this.pgs[0].id;
    const total = this.rooms.filter(r => r.pgId === pgId).length;
    const occ = this.rooms.filter(r => r.pgId === pgId && r.status !== 'VACANT').length;
    return of({
      occupancyRate: Math.round((occ / total) * 1000) / 10,
      totalRooms: total,
      occupiedRooms: occ,
      occupiedBeds: occ,
      totalBeds: total,
      paymentCollectedThisMonth: 184200,
      paymentPendingThisMonth: 38600,
      openComplaints: 3,
      pendingServiceRequests: 4,
      vacateNotices: [
        { tenantName: 'Karan Mehta', intendedDate: '2026-03-05', refundEligible: true },
        { tenantName: 'Priya Singh', intendedDate: '2026-02-28', refundEligible: false }
      ]
    }).pipe(delay(150));
  }

  listPayments(role: Role | null): Observable<RentRecord[]> {
    const all = this.clone(this.payments);
    if (role === 'TENANT') return of(all.filter(record => record.tenantName === this.tenants[0]?.name)).pipe(delay(120));
    return of(all).pipe(delay(120));
  }

  payRent(recordId: number, amount: number): Observable<RentRecord> {
    const record = this.payments.find(item => item.id === recordId);
    if (!record) return throwError(() => new Error('Payment not found'));
    record.amountPaid += amount;
    record.remainingAmountDue = Math.max(record.totalDue - record.amountPaid, 0);
    record.status = record.remainingAmountDue <= 0 ? 'PAID' : 'PARTIAL';
    return of(this.clone(record)).pipe(delay(120));
  }

  applyCredit(recordId: number): Observable<RentRecord> {
    return this.payRent(recordId, 1200);
  }

  listComplaints(role: Role | null): Observable<Complaint[]> {
    const all = this.clone(this.complaints);
    return of(role === 'TENANT' ? all.slice(0, 2) : all).pipe(delay(120));
  }

  createComplaint(payload: { category: string; description: string; attachmentPath?: string }): Observable<Complaint> {
    const complaint: Complaint = {
      id: Date.now(),
      tenantProfileId: 1,
      tenantName: this.tenants[0]?.name || 'Tenant',
      roomNumber: '101',
      category: payload.category as Complaint['category'],
      description: payload.description,
      attachmentPath: payload.attachmentPath,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      notes: ''
    };
    this.complaints.unshift(complaint);
    return of(this.clone(complaint)).pipe(delay(120));
  }

  updateComplaint(id: number, status: string, notes?: string): Observable<Complaint> {
    const complaint = this.complaints.find(item => item.id === id);
    if (!complaint) return throwError(() => new Error('Complaint not found'));
    complaint.status = status as Complaint['status'];
    complaint.notes = notes;
    complaint.updatedAt = new Date().toISOString();
    return of(this.clone(complaint)).pipe(delay(120));
  }

  listNotices(_role: Role | null): Observable<Notice[]> {
    return of(this.clone(this.notices)).pipe(delay(120));
  }

  createNotice(payload: { title: string; content: string; targetType: string; targetPgId?: number; targetUserId?: number }, createdByName: string): Observable<Notice> {
    const notice: Notice = {
      id: Date.now(),
      title: payload.title,
      content: payload.content,
      targetType: payload.targetType as Notice['targetType'],
      targetPgId: payload.targetPgId,
      targetUserId: payload.targetUserId,
      createdByName,
      createdAt: new Date().toISOString(),
      read: false,
      readCount: 0
    };
    this.notices.unshift(notice);
    this.noticeReceiptsById[notice.id] = [];
    return of(this.clone(notice)).pipe(delay(120));
  }

  markNoticeRead(id: number): Observable<Notice> {
    const notice = this.notices.find(item => item.id === id);
    if (!notice) return throwError(() => new Error('Notice not found'));
    notice.read = true;
    const receipts = this.noticeReceiptsById[id] || [];
    if (!receipts.length) {
      receipts.push({ userId: 3, userName: 'Devika Rao', role: 'TENANT', readAt: new Date().toISOString() });
    }
    notice.readCount = receipts.length;
    this.noticeReceiptsById[id] = receipts;
    return of(this.clone(notice)).pipe(delay(120));
  }

  noticeReceipts(id: number): Observable<NoticeReadReceipt[]> {
    return of(this.clone(this.noticeReceiptsById[id] || [])).pipe(delay(120));
  }

  listAmenities(role: Role | null): Observable<AmenityBooking[]> {
    const base = role === 'MANAGER'
      ? this.amenities.filter(item => item.bookingId)
      : this.amenities.filter(item => !item.bookingId);
    return of(this.clone(base)).pipe(delay(120));
  }

  createAmenitySlot(payload: { pgId: number; amenityType: string; slotDate: string; startTime: string; endTime: string; capacity: number; facilityName?: string }): Observable<AmenityBooking> {
    const slot: AmenityBooking = {
      slotId: Date.now(),
      pgId: payload.pgId,
      amenityType: payload.amenityType as AmenityBooking['amenityType'],
      facilityName: payload.facilityName,
      slotDate: payload.slotDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
      capacity: payload.capacity,
      bookingCount: 0,
      status: 'AVAILABLE'
    };
    this.amenities.unshift(slot);
    return of(this.clone(slot)).pipe(delay(120));
  }

  bookAmenity(slotId: number, isOpenInvite: boolean): Observable<AmenityBooking> {
    const slot = this.amenities.find(item => item.slotId === slotId && !item.bookingId);
    if (!slot) return throwError(() => new Error('Amenity slot not found'));
    slot.bookingCount = (slot.bookingCount || 0) + 1;
    return of(this.clone({
      ...slot,
      bookingId: Date.now(),
      tenantName: this.tenants[0]?.name || 'Tenant',
      openInvite: isOpenInvite,
      status: 'BOOKED' as const
    })).pipe(delay(120));
  }

  cancelAmenity(_bookingId: number): Observable<void> {
    return of(void 0).pipe(delay(100));
  }

  joinAmenityInvite(slotId: number): Observable<AmenityBooking> {
    return this.bookAmenity(slotId, false);
  }

  listMenu(pgId: number, weekLabel: string): Observable<MenuItem[]> {
    return of(this.clone(this.menu.filter(item => item.pgId === pgId && item.weekLabel === weekLabel))).pipe(delay(120));
  }

  saveMenu(items: MenuItem[]): Observable<MenuItem[]> {
    const [first] = items;
    if (!first) return of([]).pipe(delay(120));
    this.menu = this.menu.filter(item => !(item.pgId === first.pgId && item.weekLabel === first.weekLabel));
    this.menu.push(...items.map((item, index) => ({ ...item, id: item.id || Date.now() + index })));
    return of(this.clone(items)).pipe(delay(120));
  }

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
    const statusPool: RoomStatus[] = ['OCCUPIED', 'OCCUPIED', 'OCCUPIED', 'OCCUPIED', 'OCCUPIED', 'VACANT', 'VACANT', 'VACATING', 'SUBLETTING'];
    for (const pg of this.buildPgs()) {
      for (let floor = 1; floor <= pg.totalFloors; floor++) {
        const perFloor = pg.id === 2 ? 7 : 6;
        for (let n = 1; n <= perFloor; n++) {
          const sharing = sharings[(floor + n) % sharings.length];
          const status = statusPool[(pg.id * 3 + floor * 5 + n * 7) % statusPool.length];
          const baseRent = sharing === 'SINGLE' ? 14000 : sharing === 'DOUBLE' ? 10500 : sharing === 'TRIPLE' ? 8500 : 6500;
          rooms.push({
            id: id++,
            pgId: pg.id,
            roomNumber: `${String.fromCharCode(64 + floor)}-${floor}${n.toString().padStart(2, '0')}`,
            floor,
            isAC: (floor * n) % 3 !== 0,
            sharingType: sharing,
            monthlyRent: baseRent,
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
    const occupiedRooms = this.rooms.filter(r => r.status === 'OCCUPIED' || r.status === 'VACATING' || r.status === 'SUBLETTING');
    return occupiedRooms.slice(0, 12).map((room, index) => ({
      tenantProfileId: index + 1,
      userId: 1000 + index,
      name: ['Devika Rao', 'Karan Mehta', 'Priya Singh', 'Rahul Jain', 'Sneha Iyer', 'Vikram Shah', 'Meera Pillai', 'Aditya Roy', 'Nisha Gupta', 'Rohan Desai', 'Tara Sen', 'Yash Bhatia'][index],
      email: `tenant${index + 1}@pgms.in`,
      phone: `+91 9000000${String(index).padStart(3, '0')}`,
      roomId: room.id,
      pgId: room.pgId,
      joiningDate: '2025-08-12',
      advanceAmountPaid: 12000,
      creditWalletBalance: index === 0 ? 1200 : 0,
      status: room.status === 'VACATING' ? 'VACATING' : 'ACTIVE'
    }));
  }

  private buildPayments(): RentRecord[] {
    return this.tenants.slice(0, 6).map((tenant, index) => ({
      id: index + 1,
      tenantProfileId: tenant.tenantProfileId || index + 1,
      tenantName: tenant.name,
      roomNumber: this.rooms.find(room => room.id === tenant.roomId)?.roomNumber || `R-${index + 1}`,
      billingMonth: '2026-04',
      rentAmount: 10000 + index * 500,
      ebAmount: 600,
      fineAccrued: index % 2 === 0 ? 200 : 0,
      amountPaid: index % 3 === 0 ? 5000 : 0,
      totalDue: 10600 + index * 500 + (index % 2 === 0 ? 200 : 0),
      remainingAmountDue: index % 3 === 0 ? 5600 + index * 500 + (index % 2 === 0 ? 200 : 0) : 10600 + index * 500 + (index % 2 === 0 ? 200 : 0),
      dueDate: '2026-04-10',
      status: index % 3 === 0 ? 'PARTIAL' : index % 2 === 0 ? 'OVERDUE' : 'PENDING',
      fineWaivedReason: ''
    }));
  }

  private buildComplaints(): Complaint[] {
    return [
      { id: 1, tenantProfileId: 1, tenantName: 'Devika Rao', roomNumber: '101', category: 'MAINTENANCE', description: 'AC not cooling', status: 'OPEN', notes: '', createdAt: '2026-04-22T10:00:00' },
      { id: 2, tenantProfileId: 2, tenantName: 'Karan Mehta', roomNumber: '102', category: 'FOOD', description: 'Dinner was delayed', status: 'IN_PROGRESS', notes: 'Kitchen informed', createdAt: '2026-04-23T11:00:00' },
      { id: 3, tenantProfileId: 3, tenantName: 'Priya Singh', roomNumber: '201', category: 'AGAINST_MANAGER', description: 'Rude behaviour', status: 'ESCALATED', notes: 'Owner review needed', createdAt: '2026-04-24T09:30:00' }
    ];
  }

  private buildNotices(): Notice[] {
    return [
      { id: 1, title: 'Water shutdown', content: 'Maintenance from 2 PM to 4 PM', targetType: 'ALL_PGS', createdByName: 'StayMate Owner', createdAt: '2026-04-24T08:00:00', read: false, readCount: 2 },
      { id: 2, title: 'Floor audit', content: 'Inspection tomorrow morning', targetType: 'ALL_MANAGERS', createdByName: 'StayMate Owner', createdAt: '2026-04-23T12:00:00', read: true, readCount: 1 }
    ];
  }

  private buildNoticeReceipts(): Record<number, NoticeReadReceipt[]> {
    return {
      1: [
        { userId: 11, userName: 'Arjun Nair', role: 'MANAGER', readAt: '2026-04-24T08:15:00' },
        { userId: 21, userName: 'Devika Rao', role: 'TENANT', readAt: '2026-04-24T08:30:00' }
      ],
      2: [
        { userId: 11, userName: 'Arjun Nair', role: 'MANAGER', readAt: '2026-04-23T12:20:00' }
      ]
    };
  }

  private buildMenu(): MenuItem[] {
    const weekLabel = this.currentWeekLabel();
    return [
      { id: 1, pgId: 1, weekLabel, dayOfWeek: 'MONDAY', mealType: 'BREAKFAST', itemNames: 'Idli, Sambar', isVeg: true },
      { id: 2, pgId: 1, weekLabel, dayOfWeek: 'MONDAY', mealType: 'LUNCH', itemNames: 'Rice, Dal, Poriyal', isVeg: true },
      { id: 3, pgId: 1, weekLabel, dayOfWeek: 'MONDAY', mealType: 'DINNER', itemNames: 'Chapati, Paneer Curry', isVeg: true }
    ];
  }

  private buildAmenities(): AmenityBooking[] {
    return [
      { slotId: 7001, pgId: 1, amenityType: 'WASHING_MACHINE', facilityName: 'Laundry Room', slotDate: '2026-04-26', startTime: '07:00', endTime: '08:00', capacity: 4, bookingCount: 1, status: 'AVAILABLE' },
      { slotId: 7002, pgId: 1, amenityType: 'TABLE_TENNIS', facilityName: 'Common Lounge', slotDate: '2026-04-26', startTime: '19:00', endTime: '20:00', capacity: 8, bookingCount: 3, status: 'AVAILABLE' },
      { slotId: 7003, pgId: 2, amenityType: 'BADMINTON', facilityName: 'Terrace Court', slotDate: '2026-04-27', startTime: '18:00', endTime: '19:00', capacity: 6, bookingCount: 2, status: 'AVAILABLE' },
      { bookingId: 8101, slotId: 7001, pgId: 1, tenantName: 'Devika Rao', amenityType: 'WASHING_MACHINE', facilityName: 'Laundry Room', slotDate: '2026-04-26', startTime: '07:00', endTime: '08:00', capacity: 4, bookingCount: 1, status: 'BOOKED' }
    ];
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
    const occupants = room.status === 'VACANT' ? [] : this.tenants.filter(t => t.roomId === room.id && t.status !== 'ARCHIVED');
    return this.clone({ ...room, occupants });
  }

  private syncTenantsForRoom(room: Room) {
    if (room.status === 'VACANT') {
      this.tenants = this.tenants.map(t => t.roomId === room.id ? { ...t, status: 'ARCHIVED' } : t);
      return;
    }
    this.tenants = this.tenants.map(t => t.roomId === room.id && t.status !== 'ARCHIVED'
      ? { ...t, status: room.status === 'VACATING' ? 'VACATING' : 'ACTIVE' }
      : t
    );
  }

  private currentWeekLabel(): string {
    const now = new Date();
    const start = new Date(Date.UTC(now.getFullYear(), 0, 1));
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const day = start.getUTCDay() || 7;
    const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
    const week = Math.ceil((diff + day) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
