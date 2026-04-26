import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { MockDataService } from './mock-data.service';
import {
  AmenityBooking, Complaint, ComplaintActivity, LoginResponse, Manager, ManagerSummary, MenuItem,
  Notice, NoticeReadReceipt, OwnerSummary, PaymentOverview, PG, RentRecord, Room, RoomStatus, ServiceBooking,
  SubletRequest, Tenant, VacateNotice
} from './models';
import {
  asCollection, mapComplaint, mapComplaintActivity, mapLogin, mapManager, mapManagerSummary, mapOwnerSummary,
  mapLayoutRooms, mapPaymentOverview, mapPg, mapRentRecord, mapRoom, mapServiceBooking, mapTenant, unwrapApiPayload
} from './api-adapters';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type PathParams = Record<string, string | number>;
type QueryParams = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  params?: QueryParams;
  body?: unknown;
}

interface FallbackOptions<T> {
  mock: Observable<T>;
  isEmpty?: (value: T) => boolean;
  seed?: (value: T) => Observable<unknown>;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private mock = inject(MockDataService);

  readonly lastError = signal<string | null>(null);

  get<T>(path: string, options?: Omit<RequestOptions, 'body'>): Observable<T> {
    return this.request<T>('GET', path, options);
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>): Observable<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>): Observable<T> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  delete<T>(path: string, options?: Omit<RequestOptions, 'body'>): Observable<T> {
    return this.request<T>('DELETE', path, options);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    if (this.isDemo()) return this.mock.login(email, password);
    return this.post<unknown>(environment.endpoints.auth.login, { email, password }).pipe(
      map(mapLogin)
    );
  }

  changePassword(userId: number, newPassword: string): Observable<void> {
    if (this.isDemo()) return of(void 0);
    return this.post<unknown>(environment.endpoints.auth.changePassword, { userId, newPassword }).pipe(
      map(() => void 0)
    );
  }

  listPgs(): Observable<PG[]> {
    const path = this.role() === 'MANAGER'
      ? environment.endpoints.pgs.managerList
      : environment.endpoints.pgs.ownerList;
    const live = this.get<unknown>(path).pipe(
      map(response => asCollection(response).map(mapPg))
    );
    return this.withMockFallback(live, {
      mock: this.mock.listPgs(),
      isEmpty: list => list.length === 0,
      seed: list => this.seedMany(environment.endpoints.pgs.create, list)
    });
  }

  listRooms(pgId: number, opts?: { status?: RoomStatus; floor?: number }): Observable<Room[]> {
    const params: QueryParams = {};
    if (opts?.status) params['status'] = opts.status;
    if (opts?.floor !== undefined) params['floor'] = opts.floor;

    const live = this.get<unknown>(this.roomsPath(pgId), { params }).pipe(
      map(response => this.mapRoomsResponse(response, pgId, opts))
    );

    return this.withMockFallback(live, {
      mock: this.mock.listRooms(pgId, opts),
      isEmpty: list => list.length === 0 || this.roomsNeedOccupants(list),
      seed: list => this.seedMany(this.path(environment.endpoints.rooms.create, { pgId }), list)
    });
  }

  updateRoom(id: number, patch: Partial<Room>): Observable<Room> {
    if (this.isDemo()) return this.mock.updateRoom(id, patch);
    return this.put<unknown>(this.path(environment.endpoints.rooms.update, { id }), patch).pipe(
      map(mapRoom)
    );
  }

  updateRoomCleaningStatus(id: number, cleaningStatus: 'CLEAN' | 'DIRTY' | 'IN_PROGRESS'): Observable<Room> {
    if (this.isDemo()) return this.mock.updateRoom(id, { cleaningStatus });
    const endpoint = this.role() === 'OWNER'
      ? environment.endpoints.rooms.ownerCleaningStatus
      : environment.endpoints.rooms.managerCleaningStatus;
    return this.put<unknown>(this.path(endpoint, { id }), { cleaningStatus }).pipe(
      map(mapRoom)
    );
  }

  listManagers(): Observable<Manager[]> {
    const live = this.get<unknown>(environment.endpoints.managers.list).pipe(
      map(response => asCollection(response).map(mapManager))
    );
    return this.withMockFallback(live, {
      mock: this.mock.listManagers(),
      isEmpty: list => list.length === 0,
      seed: list => this.seedMany(environment.endpoints.managers.create, list)
    });
  }

  listTenants(): Observable<Tenant[]> {
    const path = this.role() === 'OWNER' ? environment.endpoints.tenants.ownerList : environment.endpoints.tenants.list;
    const live = this.get<unknown>(path).pipe(
      map(response => asCollection(response).map(mapTenant))
    );
    return this.withMockFallback(live, {
      mock: this.mock.listTenants(),
      isEmpty: list => list.length === 0,
      seed: list => this.seedMany(environment.endpoints.tenants.create, list)
    });
  }

  ownerSummary(): Observable<OwnerSummary> {
    const live = this.get<unknown>(environment.endpoints.analytics.ownerSummary).pipe(
      map(mapOwnerSummary)
    );
    return this.withMockFallback(live, {
      mock: this.mock.ownerSummary(),
      isEmpty: summary => summary.totalPgs === 0 && summary.totalRooms === 0
    });
  }

  managerSummary(): Observable<ManagerSummary> {
    const live = this.get<unknown>(environment.endpoints.analytics.managerSummary).pipe(
      map(mapManagerSummary)
    );
    return this.withMockFallback(live, {
      mock: this.mock.managerSummary(),
      isEmpty: summary => summary.totalRooms === 0 && summary.occupiedRooms === 0
    });
  }

  tenantProfile(): Observable<Tenant> {
    const live = this.get<unknown>(environment.endpoints.tenants.profile).pipe(
      map(response => mapTenant(unwrapApiPayload(response)))
    );
    return this.withMockFallback(live, {
      mock: this.mock.tenantProfile(),
      isEmpty: tenant => !tenant.userId && !tenant.name
    });
  }

  createTenant(payload: {
    name: string;
    email: string;
    phone: string;
    roomId: number;
    joiningDate: string;
    advanceAmountPaid: number;
  }): Observable<Tenant> {
    if (this.isDemo()) return this.mock.createTenant(payload);
    const path = this.role() === 'OWNER' ? environment.endpoints.tenants.ownerCreate : environment.endpoints.tenants.create;
    return this.post<unknown>(path, payload).pipe(map(mapTenant));
  }

  moveTenant(tenantProfileId: number, roomId: number): Observable<Tenant> {
    if (this.isDemo()) return this.mock.moveTenant(tenantProfileId, roomId);
    const path = this.role() === 'OWNER' ? environment.endpoints.tenants.ownerMove : environment.endpoints.tenants.move;
    return this.put<unknown>(this.path(path, { id: tenantProfileId }), { roomId }).pipe(map(mapTenant));
  }

  setTenantAccountStatus(tenantProfileId: number, active: boolean): Observable<Tenant> {
    if (this.isDemo()) return this.mock.setTenantAccountStatus(tenantProfileId, active);
    const path = this.role() === 'OWNER' ? environment.endpoints.tenants.ownerAccountStatus : environment.endpoints.tenants.accountStatus;
    return this.put<unknown>(this.path(path, { id: tenantProfileId }), { active }).pipe(map(mapTenant));
  }

  archiveTenant(tenantProfileId: number): Observable<Tenant> {
    if (this.isDemo()) return this.mock.archiveTenant(tenantProfileId);
    const path = this.role() === 'OWNER' ? environment.endpoints.tenants.ownerArchive : environment.endpoints.tenants.archive;
    return this.delete<unknown>(this.path(path, { id: tenantProfileId })).pipe(map(mapTenant));
  }

  createManager(payload: { name: string; email: string; phone: string; designation: string; pgIds: number[] }): Observable<Manager> {
    if (this.isDemo()) return of({
      id: Date.now(),
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      designation: payload.designation || 'Manager',
      assignedPgs: [],
      isActive: true
    });
    return this.post<unknown>(environment.endpoints.managers.create, payload).pipe(map(mapManager));
  }

  assignManagerPgs(id: number, pgIds: number[]): Observable<Manager> {
    return this.put<unknown>(this.path('/owner/managers/:id/assign', { id }), { pgIds }).pipe(map(mapManager));
  }

  setManagerActive(id: number, active: boolean): Observable<void> {
    return this.put<unknown>(this.path(active ? '/owner/managers/:id/activate' : '/owner/managers/:id/deactivate', { id }), {}).pipe(map(() => void 0));
  }

  listPayments(): Observable<RentRecord[]> {
    if (this.isDemo()) return this.mock.listPayments(this.role());
    const path = this.role() === 'TENANT'
      ? environment.endpoints.payments.tenant
      : this.role() === 'OWNER'
        ? environment.endpoints.payments.owner
        : environment.endpoints.payments.manager;
    return this.get<unknown>(path).pipe(map(response => asCollection(response).map(mapRentRecord)));
  }

  paymentOverview(): Observable<PaymentOverview> {
    if (this.isDemo()) return this.mock.paymentOverview(this.role());
    const path = this.role() === 'TENANT'
      ? environment.endpoints.payments.tenantOverview
      : this.role() === 'OWNER'
        ? environment.endpoints.payments.ownerOverview
        : environment.endpoints.payments.managerOverview;
    return this.get<unknown>(path).pipe(map(mapPaymentOverview));
  }

  payRent(recordId: number, amount: number): Observable<RentRecord> {
    if (this.isDemo()) return this.mock.payRent(recordId, amount);
    return this.post<RentRecord>(environment.endpoints.payments.tenantPay, { recordId, amount });
  }

  applyCredit(rentRecordId: number, amount: number): Observable<RentRecord> {
    if (this.isDemo()) return this.mock.applyCredit(rentRecordId, amount);
    return this.post<RentRecord>(environment.endpoints.payments.applyCredit, { rentRecordId, amount });
  }

  cashPayment(payload: { tenantProfileId: number; billingMonth: string; amount: number }): Observable<RentRecord> {
    if (this.isDemo()) return this.mock.cashPayment(payload);
    return this.post<RentRecord>(environment.endpoints.payments.cash, payload);
  }

  waiveFine(id: number, reason: string): Observable<RentRecord> {
    if (this.isDemo()) return this.mock.waiveFine(id, reason);
    const endpoint = this.role() === 'OWNER'
      ? environment.endpoints.payments.ownerWaiveFine
      : environment.endpoints.payments.waiveFine;
    return this.put<RentRecord>(this.path(endpoint, { id }), { reason });
  }

  listComplaints(): Observable<Complaint[]> {
    if (this.isDemo()) return this.mock.listComplaints(this.role());
    const role = this.role();
    const path = role === 'OWNER'
      ? environment.endpoints.complaints.owner
      : role === 'MANAGER'
        ? environment.endpoints.complaints.manager
        : environment.endpoints.complaints.tenant;
    return this.get<unknown>(path).pipe(map(response => asCollection(response).map(mapComplaint)));
  }

  createComplaint(payload: { category: string; description: string; attachmentPath?: string }): Observable<Complaint> {
    if (this.isDemo()) return this.mock.createComplaint(payload);
    return this.post<unknown>(environment.endpoints.complaints.tenant, payload).pipe(map(mapComplaint));
  }

  updateComplaint(id: number, status: string, notes?: string): Observable<Complaint> {
    if (this.isDemo()) return this.mock.updateComplaint(id, status, notes);
    const endpoint = this.role() === 'OWNER' ? environment.endpoints.complaints.ownerUpdate : environment.endpoints.complaints.managerUpdate;
    return this.put<unknown>(this.path(endpoint, { id }), { status, notes }).pipe(map(mapComplaint));
  }

  listComplaintActivities(id: number): Observable<ComplaintActivity[]> {
    if (this.isDemo()) return this.mock.listComplaintActivities(id);
    const role = this.role();
    const path = role === 'OWNER'
      ? environment.endpoints.complaints.ownerHistory
      : role === 'MANAGER'
        ? environment.endpoints.complaints.managerHistory
        : environment.endpoints.complaints.tenantHistory;
    return this.get<unknown>(this.path(path, { id })).pipe(map(response => asCollection(response).map(mapComplaintActivity)));
  }

  commentOnComplaint(id: number, message: string): Observable<Complaint> {
    if (this.isDemo()) return this.mock.commentOnComplaint(id, message);
    const role = this.role();
    const path = role === 'OWNER'
      ? environment.endpoints.complaints.ownerComment
      : role === 'MANAGER'
        ? environment.endpoints.complaints.managerComment
        : environment.endpoints.complaints.tenantComment;
    return this.post<unknown>(this.path(path, { id }), { message }).pipe(map(mapComplaint));
  }

  listNotices(): Observable<Notice[]> {
    if (this.isDemo()) return this.mock.listNotices(this.role());
    const path = this.role() === 'OWNER' ? environment.endpoints.notices.ownerList : environment.endpoints.notices.list;
    return this.get<unknown>(path).pipe(map(response => asCollection(response) as Notice[]));
  }

  createNotice(payload: { title: string; content: string; targetType: string; targetPgId?: number; targetUserId?: number }): Observable<Notice> {
    if (this.isDemo()) return this.mock.createNotice(payload, this.auth.user()?.name || 'Owner');
    const path = this.role() === 'OWNER' ? environment.endpoints.notices.ownerCreate : environment.endpoints.notices.create;
    return this.post<Notice>(path, payload);
  }

  markNoticeRead(id: number): Observable<void> {
    if (this.isDemo()) return this.mock.markNoticeRead(id).pipe(map(() => void 0));
    const path = this.role() === 'OWNER'
      ? this.path(environment.endpoints.notices.ownerRead, { id })
      : this.path(environment.endpoints.notices.read, { id });
    return this.put<unknown>(path, {}).pipe(map(() => void 0));
  }

  noticeReceipts(id: number): Observable<NoticeReadReceipt[]> {
    if (this.isDemo()) return this.mock.noticeReceipts(id);
    const path = this.role() === 'OWNER'
      ? this.path(environment.endpoints.notices.ownerReceipts, { id })
      : this.path(environment.endpoints.notices.receipts, { id });
    return this.get<NoticeReadReceipt[]>(path);
  }

  listVacates(): Observable<VacateNotice[]> {
    if (this.role() === 'TENANT') {
      return this.get<VacateNotice>(environment.endpoints.vacate.tenant).pipe(
        map(v => v ? [v] : []),
        catchError(() => of([] as VacateNotice[]))
      );
    }
    return this.get<unknown>(environment.endpoints.vacate.manager).pipe(map(response => asCollection(response) as VacateNotice[]));
  }

  createVacate(payload: { intendedVacateDate: string; hasReferral: boolean; referralName?: string; referralPhone?: string; referralEmail?: string }): Observable<VacateNotice> {
    return this.post<VacateNotice>(environment.endpoints.vacate.tenant, payload);
  }

  approveVacateReferral(id: number, approve: boolean): Observable<VacateNotice> {
    return this.put<VacateNotice>(this.path(environment.endpoints.vacate.approveReferral, { id }), { approve });
  }

  checkoutVacate(id: number): Observable<VacateNotice> {
    return this.put<VacateNotice>(this.path(environment.endpoints.vacate.checkout, { id }), {});
  }

  listServices(): Observable<ServiceBooking[]> {
    if (this.isDemo()) return this.mock.listServices(this.role());
    const path = this.role() === 'TENANT' ? environment.endpoints.services.tenant : environment.endpoints.services.manager;
    return this.get<unknown>(path).pipe(map(response => asCollection(response).map(mapServiceBooking)));
  }

  createService(payload: { serviceType: string; preferredDate: string; preferredTimeWindow?: string; requestNotes?: string }): Observable<ServiceBooking> {
    if (this.isDemo()) return this.mock.createService(payload);
    return this.post<unknown>(environment.endpoints.services.tenant, payload).pipe(map(mapServiceBooking));
  }

  updateService(id: number, status: string, notes?: string): Observable<ServiceBooking> {
    if (this.isDemo()) return this.mock.updateService(id, status, notes);
    return this.put<unknown>(this.path(environment.endpoints.services.managerUpdate, { id }), { status, notes }).pipe(map(mapServiceBooking));
  }

  rateService(id: number, rating: number, ratingComment?: string): Observable<ServiceBooking> {
    if (this.isDemo()) return this.mock.rateService(id, rating, ratingComment);
    return this.post<unknown>(this.path(environment.endpoints.services.tenantRate, { id }), { rating, ratingComment }).pipe(map(mapServiceBooking));
  }

  listAmenities(): Observable<AmenityBooking[]> {
    if (this.isDemo()) return this.mock.listAmenities(this.role());
    const path = this.role() === 'MANAGER' ? environment.endpoints.amenities.managerSlots : environment.endpoints.amenities.tenantSlots;
    return this.get<unknown>(path).pipe(map(response => asCollection(response) as AmenityBooking[]));
  }

  createAmenitySlot(payload: { pgId: number; amenityType: string; slotDate: string; startTime: string; endTime: string; capacity: number; facilityName?: string; resourceName?: string }): Observable<AmenityBooking> {
    if (this.isDemo()) return this.mock.createAmenitySlot(payload);
    return this.post<AmenityBooking>(environment.endpoints.amenities.managerSlots, payload);
  }

  updateAmenitySlot(slotId: number, payload: { pgId: number; amenityType: string; slotDate: string; startTime: string; endTime: string; capacity: number; facilityName?: string; resourceName?: string }): Observable<AmenityBooking> {
    if (this.isDemo()) return this.mock.updateAmenitySlot(slotId, payload);
    return this.put<AmenityBooking>(this.path(environment.endpoints.amenities.managerUpdateSlot, { id: slotId }), payload);
  }

  bookAmenity(slotId: number, isOpenInvite: boolean): Observable<AmenityBooking> {
    if (this.isDemo()) return this.mock.bookAmenity(slotId, isOpenInvite);
    return this.post<AmenityBooking>(environment.endpoints.amenities.tenantBook, { slotId, isOpenInvite });
  }

  cancelAmenity(bookingId: number): Observable<void> {
    if (this.isDemo()) return this.mock.cancelAmenity(bookingId).pipe(map(() => void 0));
    return this.delete<unknown>(this.path(environment.endpoints.amenities.tenantCancel, { id: bookingId })).pipe(map(() => void 0));
  }

  deleteAmenitySlot(slotId: number): Observable<void> {
    if (this.isDemo()) return this.mock.deleteAmenitySlot(slotId).pipe(map(() => void 0));
    return this.delete<unknown>(this.path(environment.endpoints.amenities.managerDeleteSlot, { id: slotId })).pipe(map(() => void 0));
  }

  joinAmenityInvite(slotId: number): Observable<AmenityBooking> {
    if (this.isDemo()) return this.mock.joinAmenityInvite(slotId);
    return this.post<AmenityBooking>(this.path(environment.endpoints.amenities.joinInvite, { slotId }), {});
  }

  listMenu(pgId: number, weekLabel: string): Observable<MenuItem[]> {
    if (this.isDemo()) return this.mock.listMenu(pgId, weekLabel);
    const path = this.role() === 'OWNER' ? environment.endpoints.menu.ownerList : environment.endpoints.menu.list;
    return this.get<unknown>(path, { params: { pgId, weekLabel } }).pipe(
      map(response => asCollection(response) as MenuItem[])
    );
  }

  saveMenu(items: MenuItem[]): Observable<MenuItem[]> {
    if (this.isDemo()) return this.mock.saveMenu(items);
    const path = this.role() === 'OWNER' ? environment.endpoints.menu.ownerSave : environment.endpoints.menu.save;
    return this.post<unknown>(path, items).pipe(map(response => asCollection(response) as MenuItem[]));
  }

  listSublets(): Observable<SubletRequest[]> {
    const path = this.role() === 'TENANT' ? environment.endpoints.sublets.tenant : environment.endpoints.sublets.manager;
    return this.get<unknown>(path).pipe(map(response => asCollection(response) as SubletRequest[]));
  }

  createSublet(payload: { startDate: string; endDate: string; reason: string }): Observable<SubletRequest> {
    return this.post<SubletRequest>(environment.endpoints.sublets.tenant, payload);
  }

  approveSublet(id: number): Observable<SubletRequest> {
    return this.put<SubletRequest>(this.path(environment.endpoints.sublets.approve, { id }), {});
  }

  checkInSublet(id: number, payload: { guestName: string; guestPhone: string; checkInDate: string }): Observable<SubletRequest> {
    return this.put<SubletRequest>(this.path(environment.endpoints.sublets.checkIn, { id }), payload);
  }

  checkoutSublet(id: number): Observable<SubletRequest> {
    return this.put<{ sublet: SubletRequest }>(this.path(environment.endpoints.sublets.checkout, { id }), {}).pipe(
      map(response => response.sublet)
    );
  }

  wallet(): Observable<{ creditWalletBalance: number }> {
    return this.get<{ creditWalletBalance: number }>(environment.endpoints.sublets.wallet);
  }

  private request<T>(method: HttpMethod, path: string, options?: RequestOptions): Observable<T> {
    const url = this.url(path);
    return this.http.request<unknown>(method, url, {
      body: options?.body,
      params: this.httpParams(options?.params)
    }).pipe(
      tap(() => this.lastError.set(null)),
      map(response => unwrapApiPayload(response) as T),
      catchError(error => {
        const normalized = this.describeError(error);
        this.lastError.set(normalized);
        return throwError(() => new Error(normalized));
      })
    );
  }

  private withMockFallback<T>(live: Observable<T>, options: FallbackOptions<T>): Observable<T> {
    if (this.isDemo()) return options.mock;

    return live.pipe(
      switchMap(value => {
        if (!options.isEmpty?.(value) || !environment.fallbackToMockOnError) return of(value);
        return options.mock.pipe(
          switchMap(mockValue => this.seedIfEnabled(mockValue, options.seed))
        );
      }),
      catchError(() => {
        if (!environment.fallbackToMockOnError) return throwError(() => new Error(this.lastError() || 'Request failed'));
        return options.mock;
      })
    );
  }

  private seedIfEnabled<T>(value: T, seed?: (value: T) => Observable<unknown>): Observable<T> {
    if (!environment.seedBackendOnEmpty || !seed) return of(value);
    return seed(value).pipe(
      map(() => value),
      catchError(() => of(value))
    );
  }

  private seedMany<T>(path: string, values: T[]): Observable<unknown> {
    if (!values.length) return of(null);
    return this.post<unknown>(path, values).pipe(
      catchError(() => this.post<unknown>(path, { items: values }))
    );
  }

  private mapRoomsResponse(response: unknown, pgId: number, opts?: { status?: RoomStatus; floor?: number }): Room[] {
    const rooms = mapLayoutRooms(response, pgId);
    const mapped = rooms.length
      ? rooms
      : asCollection(response).map(room => {
        const mappedRoom = mapRoom(room);
        return { ...mappedRoom, pgId: mappedRoom.pgId || pgId };
      });
    return mapped.filter(room =>
      (!opts?.status || room.status === opts.status) &&
      (opts?.floor === undefined || room.floor === opts.floor)
    );
  }

  private roomsPath(pgId: number): string {
    if (this.role() === 'MANAGER') {
      return this.path(environment.endpoints.rooms.managerLayoutByPg, { pgId });
    }
    return this.path(environment.endpoints.rooms.ownerLayoutByPg, { pgId });
  }

  private roomsNeedOccupants(rooms: Room[]): boolean {
    return rooms.some(room => this.occupiedStatus(room.status) && !(room.occupants?.length));
  }

  private occupiedStatus(status: RoomStatus): boolean {
    return status === 'PARTIAL' || status === 'OCCUPIED' || status === 'VACATING' || status === 'SUBLETTING';
  }

  private url(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${this.base()}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private base(): string {
    return this.auth.apiBase.replace(/\/$/, '');
  }

  private isDemo(): boolean {
    return this.auth.demoMode;
  }

  private role() {
    return this.auth.role();
  }

  private path(template: string, params: PathParams): string {
    return Object.entries(params).reduce(
      (path, [key, value]) => path.replace(`:${key}`, encodeURIComponent(String(value))),
      template
    );
  }

  private httpParams(params?: QueryParams): HttpParams | undefined {
    if (!params) return undefined;
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }

  private describeError(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      const maybe = error as { error?: { message?: string }; message?: string; status?: number };
      return maybe.error?.message || maybe.message || (maybe.status ? `Request failed (${maybe.status})` : 'Request failed');
    }
    return 'Request failed';
  }
}
