import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import {
  AmenityBooking, Complaint, ComplaintActivity, LoginResponse, Manager, ManagerSummary, MenuItem, Notice,
  NoticeReadReceipt, OwnerSummary, PaymentOverview, PaymentTransaction, PG, PgCreatePayload, PgUpdatePayload, RentRecord, Role,
  Room, RoomCreatePayload, RoomStatus, RoomUpdatePayload, ServiceBooking, SharingType, Tenant
} from './models';

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private pgs: PG[];
  private rooms: Room[];
  private managers: Manager[];
  private tenants: Tenant[];
  private payments: RentRecord[];
  private paymentTransactions: PaymentTransaction[];
  private complaints: Complaint[];
  private complaintActivitiesById: Record<number, ComplaintActivity[]>;
  private notices: Notice[];
  private noticeReceiptsById: Record<number, NoticeReadReceipt[]>;
  private services: ServiceBooking[];
  private menu: MenuItem[];
  private amenities: AmenityBooking[];

  constructor() {
    this.pgs = this.buildPgs();
    this.rooms = this.buildRooms();
    this.managers = this.buildManagers();
    this.tenants = this.buildTenants();
    this.payments = this.buildPayments();
    this.paymentTransactions = this.buildPaymentTransactions();
    this.complaints = this.buildComplaints();
    this.complaintActivitiesById = this.buildComplaintActivities();
    this.notices = this.buildNotices();
    this.noticeReceiptsById = this.buildNoticeReceipts();
    this.services = this.buildServices();
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
  listTenants(): Observable<Tenant[]> {
    return of(this.clone(this.tenants.filter(tenant => tenant.status !== 'ARCHIVED'))).pipe(delay(120));
  }

  createPg(payload: PgCreatePayload): Observable<PG> {
    const pg: PG = {
      id: Date.now(),
      name: payload.name.trim(),
      address: payload.address.trim(),
      totalFloors: payload.totalFloors,
      paymentDeadlineDay: payload.paymentDeadlineDay,
      fineAmountPerDay: payload.fineAmountPerDay,
      slaHours: payload.slaHours,
      vacantCount: 0,
      occupiedCount: 0,
      vacatingCount: 0
    };
    this.pgs.unshift(pg);
    return of(this.clone(pg)).pipe(delay(120));
  }

  updatePg(id: number, payload: PgUpdatePayload): Observable<PG> {
    const index = this.pgs.findIndex(item => item.id === id);
    if (index < 0) return throwError(() => new Error('Property not found'));
    this.pgs[index] = {
      ...this.pgs[index],
      name: payload.name.trim(),
      address: payload.address.trim(),
      totalFloors: payload.totalFloors,
      paymentDeadlineDay: payload.paymentDeadlineDay,
      fineAmountPerDay: payload.fineAmountPerDay,
      slaHours: payload.slaHours
    };
    return of(this.clone(this.pgs[index])).pipe(delay(120));
  }

  tenantProfile(): Observable<Tenant> {
    const tenant = this.tenants.find(item => item.status !== 'ARCHIVED') || this.tenants[0];
    return of({ ...tenant, creditWalletBalance: tenant?.creditWalletBalance ?? 1200 }).pipe(delay(120));
  }

  listRooms(pgId: number, opts?: { status?: RoomStatus; floor?: number }): Observable<Room[]> {
    let list = this.rooms.filter(r => r.pgId === pgId);
    if (opts?.status) list = list.filter(r => r.status === opts.status);
    if (opts?.floor !== undefined) list = list.filter(r => r.floor === opts.floor);
    return of(list.map(room => this.hydrateRoom(room))).pipe(delay(120));
  }

  createRoom(pgId: number, payload: RoomCreatePayload): Observable<Room> {
    const pg = this.pgs.find(item => item.id === pgId);
    if (!pg) return throwError(() => new Error('Property not found'));
    const roomNumber = payload.roomNumber.trim();
    if (!roomNumber) return throwError(() => new Error('Room number is required'));
    if (this.rooms.some(room => room.pgId === pgId && room.roomNumber.toLowerCase() === roomNumber.toLowerCase())) {
      return throwError(() => new Error('Room number already exists in this property'));
    }
    const room: Room = {
      id: Date.now(),
      pgId,
      roomNumber,
      floor: payload.floor,
      isAC: payload.isAC,
      sharingType: payload.sharingType,
      monthlyRent: payload.monthlyRent,
      depositAmount: payload.depositAmount,
      status: payload.status,
      cleaningStatus: payload.cleaningStatus,
      capacity: this.capacityFor(payload.sharingType),
      occupants: []
    };
    this.rooms.unshift(room);
    pg.totalFloors = Math.max(pg.totalFloors, payload.floor);
    this.recomputePgCounts();
    return of(this.hydrateRoom(room)).pipe(delay(120));
  }

  updateRoom(id: number, patch: RoomUpdatePayload): Observable<Room> {
    const index = this.rooms.findIndex(room => room.id === id);
    if (index < 0) return throwError(() => new Error('Room not found'));
    const current = this.rooms[index];
    const roomNumber = patch.roomNumber?.trim();
    if (roomNumber && this.rooms.some(room => room.id !== id && room.pgId === current.pgId && room.roomNumber.toLowerCase() === roomNumber.toLowerCase())) {
      return throwError(() => new Error('Room number already exists in this property'));
    }
    const nextSharing = patch.sharingType || current.sharingType;
    if (this.roomOccupancy(id) > this.capacityFor(nextSharing)) {
      return throwError(() => new Error('Cannot reduce room capacity below current occupancy'));
    }
    this.rooms[index] = {
      ...current,
      ...patch,
      roomNumber: roomNumber || current.roomNumber,
      capacity: this.capacityFor(nextSharing)
    };
    this.syncTenantsForRoom(this.rooms[index]);
    this.recomputePgCounts();
    return of(this.hydrateRoom(this.rooms[index])).pipe(delay(120));
  }

  createTenant(payload: { name: string; email: string; phone: string; roomId: number; joiningDate: string; advanceAmountPaid: number }): Observable<Tenant> {
    const room = this.rooms.find(item => item.id === payload.roomId);
    if (!room) return throwError(() => new Error('Room not found'));
    if (this.roomOccupancy(room.id) >= this.roomCapacity(room)) {
      return throwError(() => new Error('This room is already at full capacity'));
    }
    const tenant: Tenant = {
      tenantProfileId: Date.now(),
      userId: Date.now(),
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      roomId: room.id,
      roomNumber: room.roomNumber,
      pgId: room.pgId,
      pgName: this.pgs.find(pg => pg.id === room.pgId)?.name || '',
      joiningDate: payload.joiningDate,
      advanceAmountPaid: payload.advanceAmountPaid,
      creditWalletBalance: 0,
      status: 'ACTIVE',
      isActive: true
    };
    this.tenants.unshift(tenant);
    this.syncTenantsForRoom(room);
    this.recomputePgCounts();
    return of(this.clone(tenant)).pipe(delay(120));
  }

  moveTenant(tenantProfileId: number, roomId: number): Observable<Tenant> {
    const tenant = this.tenants.find(item => item.tenantProfileId === tenantProfileId);
    const room = this.rooms.find(item => item.id === roomId);
    if (!tenant || !room) return throwError(() => new Error('Tenant or room not found'));
    if (this.roomOccupancy(room.id) >= this.roomCapacity(room)) {
      return throwError(() => new Error('This room is already at full capacity'));
    }
    const previousRoom = this.rooms.find(item => item.id === tenant.roomId);
    tenant.roomId = room.id;
    tenant.roomNumber = room.roomNumber;
    tenant.pgId = room.pgId;
    tenant.pgName = this.pgs.find(pg => pg.id === room.pgId)?.name || '';
    if (previousRoom) this.syncTenantsForRoom(previousRoom);
    this.syncTenantsForRoom(room);
    this.recomputePgCounts();
    return of(this.clone(tenant)).pipe(delay(120));
  }

  setTenantAccountStatus(tenantProfileId: number, active: boolean): Observable<Tenant> {
    const tenant = this.tenants.find(item => item.tenantProfileId === tenantProfileId);
    if (!tenant) return throwError(() => new Error('Tenant not found'));
    tenant.isActive = active;
    return of(this.clone(tenant)).pipe(delay(120));
  }

  archiveTenant(tenantProfileId: number): Observable<Tenant> {
    const tenant = this.tenants.find(item => item.tenantProfileId === tenantProfileId);
    if (!tenant) return throwError(() => new Error('Tenant not found'));
    tenant.status = 'ARCHIVED';
    tenant.isActive = false;
    const room = this.rooms.find(item => item.id === tenant.roomId);
    if (room) this.syncTenantsForRoom(room);
    return of(this.clone(tenant)).pipe(delay(120));
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
      pendingServiceRequests: this.services.filter(item => item.status === 'REQUESTED' || item.status === 'CONFIRMED' || item.status === 'IN_PROGRESS').length,
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

  paymentOverview(role: Role | null): Observable<PaymentOverview> {
    const records = role === 'TENANT'
      ? this.payments.filter(record => record.tenantName === this.tenants[0]?.name)
      : this.payments;
    const transactions = role === 'TENANT'
      ? this.paymentTransactions.filter(transaction => transaction.tenantName === this.tenants[0]?.name)
      : this.paymentTransactions;
    const summary = this.buildPaymentSummary(records, transactions, role);
    return of(this.clone({ summary, records, transactions })).pipe(delay(120));
  }

  payRent(recordId: number, amount: number): Observable<RentRecord> {
    const record = this.payments.find(item => item.id === recordId);
    if (!record) return throwError(() => new Error('Payment not found'));
    const outstandingBefore = record.remainingAmountDue;
    record.amountPaid += amount;
    record.remainingAmountDue = Math.max(record.totalDue - record.amountPaid, 0);
    record.status = record.remainingAmountDue <= 0 ? 'PAID' : 'PARTIAL';
    this.paymentTransactions.unshift({
      id: Date.now(),
      rentRecordId: record.id,
      tenantProfileId: record.tenantProfileId,
      tenantName: record.tenantName,
      roomNumber: record.roomNumber,
      billingMonth: record.billingMonth,
      transactionType: 'TENANT_PAYMENT',
      paymentMethod: 'ONLINE',
      amount,
      signedAmount: -amount,
      outstandingBefore,
      outstandingAfter: record.remainingAmountDue,
      createdByName: record.tenantName,
      notes: 'Tenant paid rent online',
      createdAt: new Date().toISOString()
    });
    return of(this.clone(record)).pipe(delay(120));
  }

  applyCredit(recordId: number, amount: number): Observable<RentRecord> {
    const record = this.payments.find(item => item.id === recordId);
    if (!record) return throwError(() => new Error('Payment not found'));
    const tenant = this.tenants.find(item => item.tenantProfileId === record.tenantProfileId);
    const walletBefore = tenant?.creditWalletBalance || 0;
    if (walletBefore <= 0) return throwError(() => new Error('No wallet balance available'));
    if (!Number.isFinite(amount) || amount <= 0) return throwError(() => new Error('Wallet amount must be greater than zero'));
    if (amount > walletBefore) return throwError(() => new Error('Wallet amount cannot exceed the available wallet balance'));
    if (amount > record.remainingAmountDue) return throwError(() => new Error('Wallet amount cannot exceed the remaining due'));
    const deduction = amount;
    if (tenant) tenant.creditWalletBalance = walletBefore - deduction;
    const outstandingBefore = record.remainingAmountDue;
    record.amountPaid += deduction;
    record.remainingAmountDue = Math.max(record.totalDue - record.amountPaid, 0);
    record.status = record.remainingAmountDue <= 0 ? 'PAID' : 'PARTIAL';
    this.paymentTransactions.unshift({
      id: Date.now(),
      rentRecordId: record.id,
      tenantProfileId: record.tenantProfileId,
      tenantName: record.tenantName,
      roomNumber: record.roomNumber,
      billingMonth: record.billingMonth,
      transactionType: 'WALLET_CREDIT_APPLIED',
      paymentMethod: 'WALLET',
      amount: deduction,
      signedAmount: -deduction,
      outstandingBefore,
      outstandingAfter: record.remainingAmountDue,
      walletBalanceBefore: walletBefore,
      walletBalanceAfter: tenant?.creditWalletBalance || 0,
      createdByName: record.tenantName,
      notes: 'Wallet credit applied to dues',
      createdAt: new Date().toISOString()
    });
    return of(this.clone(record)).pipe(delay(120));
  }

  cashPayment(payload: { tenantProfileId: number; billingMonth: string; amount: number }): Observable<RentRecord> {
    const record = this.payments.find(item => item.tenantProfileId === payload.tenantProfileId && item.billingMonth === payload.billingMonth);
    if (!record) return throwError(() => new Error('Payment not found'));
    const outstandingBefore = record.remainingAmountDue;
    record.amountPaid += payload.amount;
    record.remainingAmountDue = Math.max(record.totalDue - record.amountPaid, 0);
    record.status = record.remainingAmountDue <= 0 ? 'PAID' : 'PARTIAL';
    this.paymentTransactions.unshift({
      id: Date.now(),
      rentRecordId: record.id,
      tenantProfileId: record.tenantProfileId,
      tenantName: record.tenantName,
      roomNumber: record.roomNumber,
      billingMonth: record.billingMonth,
      transactionType: 'MANAGER_CASH_COLLECTION',
      paymentMethod: 'CASH',
      amount: payload.amount,
      signedAmount: -payload.amount,
      outstandingBefore,
      outstandingAfter: record.remainingAmountDue,
      createdByName: 'Arjun Nair',
      notes: 'Manager recorded cash collection',
      createdAt: new Date().toISOString()
    });
    return of(this.clone(record)).pipe(delay(120));
  }

  waiveFine(id: number, reason: string): Observable<RentRecord> {
    const record = this.payments.find(item => item.id === id);
    if (!record) return throwError(() => new Error('Payment not found'));
    const waivedAmount = record.fineAccrued;
    const outstandingBefore = record.remainingAmountDue;
    record.fineAccrued = 0;
    record.totalDue = record.rentAmount + (record.ebAmount || 0);
    record.remainingAmountDue = Math.max(record.totalDue - record.amountPaid, 0);
    record.fineWaivedReason = reason;
    record.status = record.remainingAmountDue <= 0 ? 'PAID' : record.amountPaid > 0 ? 'PARTIAL' : 'PENDING';
    this.paymentTransactions.unshift({
      id: Date.now(),
      rentRecordId: record.id,
      tenantProfileId: record.tenantProfileId,
      tenantName: record.tenantName,
      roomNumber: record.roomNumber,
      billingMonth: record.billingMonth,
      transactionType: 'FINE_WAIVER',
      paymentMethod: 'ADJUSTMENT',
      amount: waivedAmount,
      signedAmount: -waivedAmount,
      outstandingBefore,
      outstandingAfter: record.remainingAmountDue,
      createdByName: 'Arjun Nair',
      notes: reason,
      createdAt: new Date().toISOString()
    });
    return of(this.clone(record)).pipe(delay(120));
  }

  listComplaints(role: Role | null): Observable<Complaint[]> {
    const all = this.clone(this.complaints.map(complaint => this.decorateComplaint(complaint)));
    return of(role === 'TENANT' ? all.slice(0, 2) : all).pipe(delay(120));
  }

  listServices(role: Role | null): Observable<ServiceBooking[]> {
    const all = this.clone(this.services);
    if (role === 'TENANT') {
      const currentTenant = this.tenants[0]?.tenantProfileId;
      return of(all.filter(item => item.tenantProfileId === currentTenant)).pipe(delay(120));
    }
    return of(all).pipe(delay(120));
  }

  createService(payload: { serviceType: string; preferredDate: string; preferredTimeWindow?: string; requestNotes?: string }): Observable<ServiceBooking> {
    if (!payload.preferredDate) {
      return throwError(() => new Error('Preferred date is required'));
    }
    const preferredDate = new Date(payload.preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(preferredDate.getTime()) || preferredDate < today) {
      return throwError(() => new Error('Preferred date cannot be in the past'));
    }
    const tenant = this.tenants[0];
    if (!tenant) return throwError(() => new Error('Tenant not found'));
    const preferredTimeWindow = payload.preferredTimeWindow?.trim() || '';
    const duplicate = this.services.find(item =>
      item.tenantProfileId === tenant.tenantProfileId
      && item.serviceType === payload.serviceType
      && item.preferredDate === payload.preferredDate
      && (item.preferredTimeWindow || '') === preferredTimeWindow
      && ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'].includes(item.status)
    );
    if (duplicate) {
      return throwError(() => new Error('An active request already exists for this service and time window'));
    }
    const now = new Date().toISOString();
    const booking: ServiceBooking = {
      id: Date.now(),
      tenantProfileId: tenant.tenantProfileId,
      tenantName: tenant.name,
      pgId: tenant.pgId,
      pgName: tenant.pgName,
      roomNumber: tenant.roomNumber,
      serviceType: payload.serviceType as ServiceBooking['serviceType'],
      preferredDate: payload.preferredDate,
      preferredTimeWindow,
      requestNotes: payload.requestNotes?.trim() || '',
      status: 'REQUESTED',
      createdAt: now,
      updatedAt: now
    };
    this.services.unshift(booking);
    return of(this.clone(booking)).pipe(delay(120));
  }

  updateService(id: number, status: string, notes?: string): Observable<ServiceBooking> {
    const booking = this.services.find(item => item.id === id);
    if (!booking) return throwError(() => new Error('Service request not found'));
    const nextStatus = status as ServiceBooking['status'];
    const valid = (booking.status === 'REQUESTED' && (nextStatus === 'CONFIRMED' || nextStatus === 'REJECTED'))
      || (booking.status === 'CONFIRMED' && (nextStatus === 'IN_PROGRESS' || nextStatus === 'REJECTED'))
      || (booking.status === 'IN_PROGRESS' && nextStatus === 'COMPLETED');
    if (!valid) {
      return throwError(() => new Error('Invalid service status transition'));
    }
    const managerNotes = notes?.trim() || '';
    if ((nextStatus === 'REJECTED' || nextStatus === 'COMPLETED') && !managerNotes) {
      return throwError(() => new Error(nextStatus === 'REJECTED' ? 'Rejection reason is required' : 'Completion note is required'));
    }
    const now = new Date().toISOString();
    booking.status = nextStatus;
    if (managerNotes) booking.managerNotes = managerNotes;
    booking.updatedAt = now;
    if (nextStatus === 'CONFIRMED') booking.confirmedAt = now;
    if (nextStatus === 'IN_PROGRESS') booking.startedAt = now;
    if (nextStatus === 'COMPLETED') booking.completedAt = now;
    if (nextStatus === 'REJECTED') booking.rejectedAt = now;
    return of(this.clone(booking)).pipe(delay(120));
  }

  rateService(id: number, rating: number, ratingComment?: string): Observable<ServiceBooking> {
    const booking = this.services.find(item => item.id === id);
    if (!booking) return throwError(() => new Error('Service request not found'));
    if (booking.status !== 'COMPLETED') return throwError(() => new Error('Only completed services can be rated'));
    if (booking.rating) return throwError(() => new Error('Service booking has already been rated'));
    booking.rating = rating;
    booking.ratingComment = ratingComment?.trim() || '';
    booking.updatedAt = new Date().toISOString();
    return of(this.clone(booking)).pipe(delay(120));
  }

  listComplaintActivities(id: number): Observable<ComplaintActivity[]> {
    return of(this.clone(this.complaintActivitiesById[id] || [])).pipe(delay(120));
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
    this.complaintActivitiesById[complaint.id] = [{
      id: Date.now() + 1,
      activityType: 'CREATED',
      actorRole: 'TENANT',
      actorName: complaint.tenantName,
      toStatus: 'OPEN',
      message: complaint.description,
      createdAt: complaint.createdAt
    }];
    return of(this.clone(this.decorateComplaint(complaint))).pipe(delay(120));
  }

  updateComplaint(id: number, status: string, notes?: string): Observable<Complaint> {
    const complaint = this.complaints.find(item => item.id === id);
    if (!complaint) return throwError(() => new Error('Complaint not found'));
    const previousStatus = complaint.status;
    complaint.status = status as Complaint['status'];
    complaint.updatedAt = new Date().toISOString();
    this.complaintActivitiesById[id] = [
      ...(this.complaintActivitiesById[id] || []),
      {
        id: Date.now(),
        activityType: 'STATUS_CHANGE',
        actorRole: 'MANAGER',
        actorName: 'Arjun Nair',
        fromStatus: previousStatus,
        toStatus: status as Complaint['status'],
        message: notes || '',
        createdAt: complaint.updatedAt
      }
    ];
    if (notes) complaint.notes = notes;
    return of(this.clone(this.decorateComplaint(complaint))).pipe(delay(120));
  }

  commentOnComplaint(id: number, message: string): Observable<Complaint> {
    const complaint = this.complaints.find(item => item.id === id);
    if (!complaint) return throwError(() => new Error('Complaint not found'));
    complaint.updatedAt = new Date().toISOString();
    complaint.notes = message;
    this.complaintActivitiesById[id] = [
      ...(this.complaintActivitiesById[id] || []),
      {
        id: Date.now(),
        activityType: 'COMMENT',
        actorRole: 'MANAGER',
        actorName: 'Arjun Nair',
        message,
        createdAt: complaint.updatedAt
      }
    ];
    return of(this.clone(this.decorateComplaint(complaint))).pipe(delay(120));
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
    if (role === 'MANAGER') {
      const baseSlots = this.amenities.filter(item => !item.bookingId);
      const bookings = this.amenities.filter(item => item.bookingId && item.status === 'BOOKED');
      const merged = baseSlots.map(slot => {
        const slotBookings = bookings.filter(item => item.slotId === slot.slotId);
        const firstBooking = slotBookings[0];
        const hostBooking = slotBookings.find(item => item.openInvite);
        const effectiveCapacity = slot.amenityType === 'WASHING_MACHINE' ? 1 : slot.capacity;
        return {
          ...slot,
          tenantName: firstBooking?.tenantName,
          hostName: hostBooking?.tenantName,
          bookedByName: firstBooking?.tenantName,
          openInvite: !!hostBooking?.openInvite,
          joinable: false,
          shareable: slot.amenityType !== 'WASHING_MACHINE',
          bookingCount: slotBookings.length,
          capacity: effectiveCapacity,
          status: slotBookings.length ? 'BOOKED' as const : 'AVAILABLE' as const
        };
      });
      return of(this.clone(merged)).pipe(delay(120));
    }

    const currentTenant = this.tenants[0]?.name || 'Devika Rao';
    const baseSlots = this.amenities.filter(item => !item.bookingId);
    const bookings = this.amenities.filter(item => item.bookingId && item.status === 'BOOKED');

    const merged = baseSlots.map(slot => {
      const slotBookings = bookings.filter(item => item.slotId === slot.slotId);
      const ownBooking = slotBookings.find(item => item.tenantName === currentTenant);
      const hostBooking = ownBooking ? undefined : slotBookings.find(item => item.openInvite);
      const effectiveCapacity = slot.amenityType === 'WASHING_MACHINE' ? 1 : slot.capacity;
      return {
        ...slot,
        bookingId: ownBooking?.bookingId,
        tenantName: ownBooking?.tenantName,
        hostName: hostBooking?.tenantName,
        bookedByName: ownBooking?.tenantName || hostBooking?.tenantName || slotBookings[0]?.tenantName,
        openInvite: !!ownBooking?.openInvite || !!hostBooking?.openInvite,
        joinable: slot.amenityType !== 'WASHING_MACHINE' && !ownBooking && !!hostBooking && slotBookings.length < effectiveCapacity,
        shareable: slot.amenityType !== 'WASHING_MACHINE',
        bookingCount: slotBookings.length,
        capacity: effectiveCapacity,
        status: ownBooking ? 'BOOKED' as const : 'AVAILABLE' as const
      };
    });

    return of(this.clone(merged)).pipe(delay(120));
  }

  createAmenitySlot(payload: { pgId: number; amenityType: string; slotDate: string; startTime: string; endTime: string; capacity: number; facilityName?: string; resourceName?: string }): Observable<AmenityBooking> {
    const amenityType = payload.amenityType as AmenityBooking['amenityType'];
    const location = payload.facilityName?.trim() || (amenityType === 'WASHING_MACHINE' ? 'Laundry Room' : 'Common Area');
    const resourceLabel = payload.resourceName?.trim() || this.defaultAmenityResourceName(amenityType);
    const slots: AmenityBooking[] = this.splitAmenityWindow(payload).flatMap((slot, index): AmenityBooking[] => {
      if (amenityType === 'WASHING_MACHINE') {
        return Array.from({ length: Math.max(1, payload.capacity) }, (_, unitIndex): AmenityBooking => ({
          slotId: Date.now() + (index * 100) + unitIndex,
          pgId: payload.pgId,
          amenityType,
          facilityName: location,
          resourceName: `${resourceLabel} ${unitIndex + 1}`,
          slotDate: payload.slotDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          capacity: 1,
          bookingCount: 0,
          shareable: false,
          status: 'AVAILABLE' as const
        }));
      }
      return [{
        slotId: Date.now() + index,
        pgId: payload.pgId,
        amenityType,
        facilityName: location,
        resourceName: resourceLabel,
        slotDate: payload.slotDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity: Math.max(1, payload.capacity),
        bookingCount: 0,
        shareable: true,
        status: 'AVAILABLE' as const
      }] as AmenityBooking[];
    });
    this.amenities.unshift(...slots);
    return of(this.clone(slots[0])).pipe(delay(120));
  }

  updateAmenitySlot(slotId: number, payload: { pgId: number; amenityType: string; slotDate: string; startTime: string; endTime: string; capacity: number; facilityName?: string; resourceName?: string }): Observable<AmenityBooking> {
    const index = this.amenities.findIndex(item => item.slotId === slotId && !item.bookingId);
    if (index < 0) return throwError(() => new Error('Amenity slot not found'));
    const hasBooking = this.amenities.some(item => item.slotId === slotId && !!item.bookingId && item.status === 'BOOKED');
    if (hasBooking) return throwError(() => new Error('Booked slots cannot be edited'));
    const amenityType = payload.amenityType as AmenityBooking['amenityType'];
    const resourceLabel = payload.resourceName?.trim() || this.defaultAmenityResourceName(amenityType);
    this.amenities[index] = {
      ...this.amenities[index],
      pgId: payload.pgId,
      amenityType,
      facilityName: payload.facilityName?.trim() || (amenityType === 'WASHING_MACHINE' ? 'Laundry Room' : 'Common Area'),
      resourceName: amenityType === 'WASHING_MACHINE' ? resourceLabel : resourceLabel,
      slotDate: payload.slotDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
      capacity: amenityType === 'WASHING_MACHINE' ? 1 : Math.max(1, payload.capacity),
      shareable: amenityType !== 'WASHING_MACHINE'
    };
    return of(this.clone(this.amenities[index])).pipe(delay(120));
  }

  bookAmenity(slotId: number, isOpenInvite: boolean): Observable<AmenityBooking> {
    const slot = this.amenities.find(item => item.slotId === slotId && !item.bookingId);
    if (!slot) return throwError(() => new Error('Amenity slot not found'));
    const effectiveCapacity = slot.amenityType === 'WASHING_MACHINE' ? 1 : slot.capacity;
    const bookingCount = this.amenities.filter(item => item.slotId === slotId && item.bookingId && item.status === 'BOOKED').length;
    const currentTenant = this.tenants[0]?.name || 'Tenant';
    const overlaps = this.amenities
      .filter(item => !!item.bookingId && item.status === 'BOOKED' && item.tenantName === currentTenant && item.slotDate === slot.slotDate)
      .some(item => this.timeToMinutes(item.startTime) < this.timeToMinutes(slot.endTime)
        && this.timeToMinutes(slot.startTime) < this.timeToMinutes(item.endTime));
    if (overlaps) return throwError(() => new Error('You already have another amenity booking that overlaps with this time'));
    if (bookingCount >= effectiveCapacity) return throwError(() => new Error('Slot is full'));
    if (isOpenInvite && slot.amenityType === 'WASHING_MACHINE') {
      return throwError(() => new Error('Washing machines cannot be opened as shared invites'));
    }
    const booking = {
      ...slot,
      bookingId: Date.now(),
      tenantName: currentTenant,
      openInvite: isOpenInvite,
      shareable: slot.amenityType !== 'WASHING_MACHINE',
      capacity: effectiveCapacity,
      status: 'BOOKED' as const
    };
    this.amenities.push(booking);
    return of(this.clone(booking)).pipe(delay(120));
  }

  cancelAmenity(bookingId: number): Observable<void> {
    this.amenities = this.amenities.filter(item => item.bookingId !== bookingId);
    return of(void 0).pipe(delay(100));
  }

  deleteAmenitySlot(slotId: number): Observable<void> {
    const hasBooking = this.amenities.some(item => item.slotId === slotId && !!item.bookingId && item.status === 'BOOKED');
    if (hasBooking) return throwError(() => new Error('Booked slots cannot be deleted'));
    this.amenities = this.amenities.filter(item => item.slotId !== slotId);
    return of(void 0).pipe(delay(100));
  }

  joinAmenityInvite(slotId: number): Observable<AmenityBooking> {
    const slot = this.amenities.find(item => item.slotId === slotId && !item.bookingId);
    if (slot?.amenityType === 'WASHING_MACHINE') {
      return throwError(() => new Error('Washing machines cannot be joined as shared bookings'));
    }
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
      pgId: tenant.pgId,
      pgName: this.pgs.find(pg => pg.id === tenant.pgId)?.name || 'PG',
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

  private buildPaymentTransactions(): PaymentTransaction[] {
    return this.payments.flatMap(record => {
      const items: PaymentTransaction[] = [
        {
          id: record.id * 100 + 1,
          rentRecordId: record.id,
          tenantProfileId: record.tenantProfileId,
          tenantName: record.tenantName,
          roomNumber: record.roomNumber,
          billingMonth: record.billingMonth,
          transactionType: 'RENT_CHARGE',
          paymentMethod: 'SYSTEM',
          amount: record.totalDue,
          signedAmount: record.totalDue,
          outstandingBefore: 0,
          outstandingAfter: record.totalDue,
          createdByName: 'System',
          notes: 'Monthly rent generated',
          createdAt: '2026-04-01T00:05:00'
        }
      ];
      if (record.fineAccrued > 0) {
        items.push({
          id: record.id * 100 + 2,
          rentRecordId: record.id,
          tenantProfileId: record.tenantProfileId,
          tenantName: record.tenantName,
          roomNumber: record.roomNumber,
          billingMonth: record.billingMonth,
          transactionType: 'LATE_FEE_APPLIED',
          paymentMethod: 'SYSTEM',
          amount: record.fineAccrued,
          signedAmount: record.fineAccrued,
          outstandingBefore: record.totalDue - record.fineAccrued,
          outstandingAfter: record.totalDue,
          createdByName: 'System',
          notes: 'Late fee applied',
          createdAt: '2026-04-11T00:05:00'
        });
      }
      if (record.amountPaid > 0) {
        items.push({
          id: record.id * 100 + 3,
          rentRecordId: record.id,
          tenantProfileId: record.tenantProfileId,
          tenantName: record.tenantName,
          roomNumber: record.roomNumber,
          billingMonth: record.billingMonth,
          transactionType: 'TENANT_PAYMENT',
          paymentMethod: 'ONLINE',
          amount: record.amountPaid,
          signedAmount: -record.amountPaid,
          outstandingBefore: record.totalDue,
          outstandingAfter: record.remainingAmountDue,
          createdByName: record.tenantName,
          notes: 'Tenant paid part of the due online',
          createdAt: '2026-04-05T10:00:00'
        });
      }
      return items;
    }).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  private buildPaymentSummary(records: RentRecord[], transactions: PaymentTransaction[], role: Role | null) {
    const walletBalance = role === 'TENANT' ? (this.tenants[0]?.creditWalletBalance || 0) : this.tenants.reduce((sum, tenant) => sum + (tenant.creditWalletBalance || 0), 0);
    return {
      currentBillingMonth: '2026-04',
      totalRecords: records.length,
      paidRecords: records.filter(record => record.status === 'PAID').length,
      partialRecords: records.filter(record => record.status === 'PARTIAL').length,
      pendingRecords: records.filter(record => record.status === 'PENDING').length,
      overdueRecords: records.filter(record => record.status === 'OVERDUE').length,
      tenantCount: new Set(records.map(record => record.tenantProfileId)).size,
      transactionCount: transactions.length,
      totalDue: records.reduce((sum, record) => sum + record.totalDue, 0),
      totalPaid: records.reduce((sum, record) => sum + record.amountPaid, 0),
      totalOutstanding: records.reduce((sum, record) => sum + record.remainingAmountDue, 0),
      overdueAmount: records.filter(record => record.status === 'OVERDUE').reduce((sum, record) => sum + record.remainingAmountDue, 0),
      fineOutstanding: records.reduce((sum, record) => sum + record.fineAccrued, 0),
      walletBalance
    };
  }

  private buildComplaints(): Complaint[] {
    return [
      { id: 1, tenantProfileId: 1, tenantName: 'Devika Rao', roomNumber: '101', category: 'MAINTENANCE', description: 'AC not cooling', status: 'OPEN', notes: '', createdAt: '2026-04-22T10:00:00' },
      { id: 2, tenantProfileId: 2, tenantName: 'Karan Mehta', roomNumber: '102', category: 'FOOD', description: 'Dinner was delayed', status: 'IN_PROGRESS', notes: 'Kitchen informed', createdAt: '2026-04-23T11:00:00' },
      { id: 3, tenantProfileId: 3, tenantName: 'Priya Singh', roomNumber: '201', category: 'AGAINST_MANAGER', description: 'Rude behaviour', status: 'ESCALATED', notes: 'Owner review needed', createdAt: '2026-04-24T09:30:00' }
    ];
  }

  private buildComplaintActivities(): Record<number, ComplaintActivity[]> {
    return {
      1: [
        { id: 1001, activityType: 'CREATED', actorRole: 'TENANT', actorName: 'Devika Rao', toStatus: 'OPEN', message: 'AC not cooling', createdAt: '2026-04-22T10:00:00' }
      ],
      2: [
        { id: 1002, activityType: 'CREATED', actorRole: 'TENANT', actorName: 'Karan Mehta', toStatus: 'OPEN', message: 'Dinner was delayed', createdAt: '2026-04-23T11:00:00' },
        { id: 1003, activityType: 'STATUS_CHANGE', actorRole: 'MANAGER', actorName: 'Arjun Nair', fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', message: 'Kitchen informed', createdAt: '2026-04-23T12:10:00' }
      ],
      3: [
        { id: 1004, activityType: 'CREATED', actorRole: 'TENANT', actorName: 'Priya Singh', toStatus: 'OPEN', message: 'Rude behaviour', createdAt: '2026-04-24T09:30:00' },
        { id: 1005, activityType: 'STATUS_CHANGE', actorRole: 'TENANT', actorName: 'System', fromStatus: 'OPEN', toStatus: 'ESCALATED', message: 'Owner review needed', createdAt: '2026-04-24T16:00:00' }
      ]
    };
  }

  private decorateComplaint(complaint: Complaint): Complaint {
    const activities = this.complaintActivitiesById[complaint.id] || [];
    const latest = activities[activities.length - 1];
    return {
      ...complaint,
      latestActivitySummary: latest?.message || (latest?.toStatus ? `Status moved to ${latest.toStatus}` : ''),
      activityCount: activities.length
    };
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

  private buildServices(): ServiceBooking[] {
    const baseTenant = this.tenants[0];
    const otherTenant = this.tenants[1];
    const thirdTenant = this.tenants[2];
    const services: ServiceBooking[] = [
      {
        id: 5001,
        tenantProfileId: baseTenant?.tenantProfileId,
        tenantName: baseTenant?.name,
        pgId: baseTenant?.pgId,
        pgName: baseTenant?.pgName,
        roomNumber: baseTenant?.roomNumber,
        serviceType: 'CLEANING',
        preferredDate: '2026-04-28',
        preferredTimeWindow: '7:00 PM - 9:00 PM',
        requestNotes: 'Need deep cleaning near the study table and bathroom drain.',
        status: 'REQUESTED',
        createdAt: '2026-04-27T08:30:00',
        updatedAt: '2026-04-27T08:30:00'
      },
      {
        id: 5002,
        tenantProfileId: otherTenant?.tenantProfileId,
        tenantName: otherTenant?.name,
        pgId: otherTenant?.pgId,
        pgName: otherTenant?.pgName,
        roomNumber: otherTenant?.roomNumber,
        serviceType: 'PLUMBING',
        preferredDate: '2026-04-27',
        preferredTimeWindow: '10:00 AM - 12:00 PM',
        requestNotes: 'Wash basin tap is leaking continuously.',
        status: 'CONFIRMED',
        managerNotes: 'Technician assigned for the morning round.',
        createdAt: '2026-04-26T18:15:00',
        updatedAt: '2026-04-26T20:00:00',
        confirmedAt: '2026-04-26T20:00:00'
      },
      {
        id: 5003,
        tenantProfileId: thirdTenant?.tenantProfileId,
        tenantName: thirdTenant?.name,
        pgId: thirdTenant?.pgId,
        pgName: thirdTenant?.pgName,
        roomNumber: thirdTenant?.roomNumber,
        serviceType: 'ELECTRICAL',
        preferredDate: '2026-04-27',
        preferredTimeWindow: '2:00 PM - 4:00 PM',
        requestNotes: 'Bedside plug point is sparking intermittently.',
        status: 'IN_PROGRESS',
        managerNotes: 'Electrician is on site and checking the socket line.',
        createdAt: '2026-04-26T09:20:00',
        updatedAt: '2026-04-27T14:10:00',
        confirmedAt: '2026-04-26T11:30:00',
        startedAt: '2026-04-27T14:10:00'
      },
      {
        id: 5004,
        tenantProfileId: baseTenant?.tenantProfileId,
        tenantName: baseTenant?.name,
        pgId: baseTenant?.pgId,
        pgName: baseTenant?.pgName,
        roomNumber: baseTenant?.roomNumber,
        serviceType: 'LINEN_CHANGE',
        preferredDate: '2026-04-24',
        preferredTimeWindow: '6:00 PM - 8:00 PM',
        requestNotes: 'Please replace the bedsheet and pillow cover set.',
        status: 'COMPLETED',
        managerNotes: 'Fresh linen delivered and old set collected.',
        rating: 5,
        ratingComment: 'Quick turnaround and neatly done.',
        createdAt: '2026-04-23T19:00:00',
        updatedAt: '2026-04-24T19:15:00',
        confirmedAt: '2026-04-24T09:30:00',
        startedAt: '2026-04-24T18:05:00',
        completedAt: '2026-04-24T19:15:00'
      }
    ];
    return services.filter(item => !!item.tenantProfileId);
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
      { slotId: 7001, pgId: 1, amenityType: 'WASHING_MACHINE', facilityName: 'Laundry Room', resourceName: 'Machine 1', slotDate: '2026-04-26', startTime: '07:00', endTime: '07:30', capacity: 1, shareable: false, status: 'AVAILABLE' },
      { slotId: 7002, pgId: 1, amenityType: 'WASHING_MACHINE', facilityName: 'Laundry Room', resourceName: 'Machine 2', slotDate: '2026-04-26', startTime: '07:00', endTime: '07:30', capacity: 1, shareable: false, status: 'AVAILABLE' },
      { slotId: 7003, pgId: 1, amenityType: 'WASHING_MACHINE', facilityName: 'Laundry Room', resourceName: 'Machine 1', slotDate: '2026-04-26', startTime: '07:30', endTime: '08:00', capacity: 1, shareable: false, status: 'AVAILABLE' },
      { slotId: 7004, pgId: 1, amenityType: 'TABLE_TENNIS', facilityName: 'Common Lounge', resourceName: 'Table', slotDate: '2026-04-26', startTime: '19:00', endTime: '19:30', capacity: 2, shareable: true, status: 'AVAILABLE' },
      { slotId: 7005, pgId: 1, amenityType: 'TABLE_TENNIS', facilityName: 'Common Lounge', resourceName: 'Table', slotDate: '2026-04-26', startTime: '19:30', endTime: '20:00', capacity: 2, shareable: true, status: 'AVAILABLE' },
      { slotId: 7006, pgId: 1, amenityType: 'CARROM', facilityName: 'Rec Room', resourceName: 'Board', slotDate: '2026-04-27', startTime: '20:00', endTime: '20:30', capacity: 4, shareable: true, status: 'AVAILABLE' },
      { slotId: 7007, pgId: 1, amenityType: 'CARROM', facilityName: 'Rec Room', resourceName: 'Board', slotDate: '2026-04-27', startTime: '20:30', endTime: '21:00', capacity: 4, shareable: true, status: 'AVAILABLE' },
      { bookingId: 8101, slotId: 7001, pgId: 1, tenantName: 'Devika Rao', amenityType: 'WASHING_MACHINE', facilityName: 'Laundry Room', resourceName: 'Machine 1', slotDate: '2026-04-26', startTime: '07:00', endTime: '07:30', capacity: 1, shareable: false, status: 'BOOKED' },
      { bookingId: 8102, slotId: 7004, pgId: 1, tenantName: 'Arjun Nair', amenityType: 'TABLE_TENNIS', facilityName: 'Common Lounge', resourceName: 'Table', slotDate: '2026-04-26', startTime: '19:00', endTime: '19:30', capacity: 2, shareable: true, openInvite: true, status: 'BOOKED' },
      { bookingId: 8103, slotId: 7005, pgId: 1, tenantName: 'Praveen K', amenityType: 'TABLE_TENNIS', facilityName: 'Common Lounge', resourceName: 'Table', slotDate: '2026-04-26', startTime: '19:30', endTime: '20:00', capacity: 2, shareable: true, status: 'BOOKED' }
    ];
  }

  private splitAmenityWindow(payload: { startTime: string; endTime: string }): Array<{ startTime: string; endTime: string }> {
    const parts: Array<{ startTime: string; endTime: string }> = [];
    let cursor = this.timeToMinutes(payload.startTime);
    const end = this.timeToMinutes(payload.endTime);
    while (cursor < end) {
      const next = Math.min(cursor + 30, end);
      parts.push({ startTime: this.minutesToTime(cursor), endTime: this.minutesToTime(next) });
      cursor = next;
    }
    return parts;
  }

  private timeToMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  private minutesToTime(value: number): string {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private defaultAmenityResourceName(type: AmenityBooking['amenityType']): string {
    switch (type) {
      case 'WASHING_MACHINE': return 'Machine';
      case 'TABLE_TENNIS': return 'Table';
      case 'CARROM': return 'Board';
      case 'BADMINTON': return 'Court';
    }
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
    this.tenants = this.tenants.map(t => t.roomId === room.id && t.status !== 'ARCHIVED'
      ? { ...t, status: room.status === 'VACATING' ? 'VACATING' : 'ACTIVE' }
      : t
    );
    if (room.status === 'MAINTENANCE' || room.status === 'SUBLETTING' || room.status === 'VACATING') {
      return;
    }
    const occupancy = this.roomOccupancy(room.id);
    room.status = occupancy === 0 ? 'VACANT' : occupancy < this.roomCapacity(room) ? 'PARTIAL' : 'OCCUPIED';
  }

  private roomCapacity(room: Room): number {
    return this.capacityFor(room.sharingType);
  }

  private capacityFor(sharingType: SharingType): number {
    switch (sharingType) {
      case 'SINGLE': return 1;
      case 'DOUBLE': return 2;
      case 'TRIPLE': return 3;
      case 'DORM': return 6;
    }
  }

  private roomOccupancy(roomId: number): number {
    return this.tenants.filter(t => t.roomId === roomId && t.status !== 'ARCHIVED').length;
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
