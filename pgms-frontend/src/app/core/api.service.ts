import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { MockDataService } from './mock-data.service';
import {
  LoginResponse, Manager, ManagerSummary, OwnerSummary, PG, Room, RoomStatus, Tenant
} from './models';
import {
  asCollection, mapLogin, mapManager, mapManagerSummary, mapOwnerSummary,
  mapLayoutRooms, mapPg, mapRoom, mapTenant, unwrapApiPayload
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
    const live = this.get<unknown>(environment.endpoints.tenants.list).pipe(
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
    return status === 'OCCUPIED' || status === 'VACATING' || status === 'SUBLETTING';
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
