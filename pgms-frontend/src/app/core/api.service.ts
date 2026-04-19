import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { MockDataService } from './mock-data.service';
import {
    BaseResponse, LoginResponse, PG, Room, Tenant, Manager,
    OwnerSummary, ManagerSummary, RoomStatus
} from './models';

function unwrap<T>(r: BaseResponse<T>): T {
    if (!r?.success) throw new Error(r?.message || 'Request failed');
    return r.data as T;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private mock = inject(MockDataService);

    private base(): string { return this.auth.apiBase.replace(/\/$/, ''); }
    private isDemo(): boolean { return this.auth.demoMode; }

    login(email: string, password: string): Observable<LoginResponse> {
        if (this.isDemo()) return this.mock.login(email, password);
        return new Observable(sub => {
            this.http.post<BaseResponse<LoginResponse>>(`${this.base()}/auth/login`, { email, password })
                .subscribe({ next: r => { try { sub.next(unwrap(r)); sub.complete(); } catch (e) { sub.error(e); } }, error: e => sub.error(e) });
        });
    }

    changePassword(userId: number, newPassword: string): Observable<void> {
        if (this.isDemo()) return of(void 0);
        return new Observable(sub => {
            this.http.post<BaseResponse<unknown>>(`${this.base()}/auth/change-password`, { userId, newPassword })
                .subscribe({ next: r => { try { unwrap(r); sub.next(); sub.complete(); } catch (e) { sub.error(e); } }, error: e => sub.error(e) });
        });
    }

    listPgs(): Observable<PG[]> {
        if (this.isDemo()) return this.mock.listPgs();
        return new Observable(sub => {
            this.http.get<BaseResponse<PG[]>>(`${this.base()}/owner/pgs`)
                .subscribe({ next: r => { try { sub.next(unwrap(r)); sub.complete(); } catch (e) { sub.error(e); } }, error: e => sub.error(e) });
        });
    }

    listRooms(pgId: number, opts?: { status?: RoomStatus; floor?: number }): Observable<Room[]> {
        if (this.isDemo()) return this.mock.listRooms(pgId, opts);
        const params: Record<string, string> = {};
        if (opts?.status) params['status'] = opts.status;
        if (opts?.floor !== undefined) params['floor'] = String(opts.floor);
        return new Observable(sub => {
            this.http.get<BaseResponse<Room[]>>(`${this.base()}/owner/pgs/${pgId}/rooms`, { params })
                .subscribe({ next: r => { try { sub.next(unwrap(r)); sub.complete(); } catch (e) { sub.error(e); } }, error: e => sub.error(e) });
        });
    }

    updateRoom(id: number, patch: Partial<Room>): Observable<Room> {
        if (this.isDemo()) return this.mock.updateRoom(id, patch);
        return new Observable(sub => {
            this.http.put<BaseResponse<Room>>(`${this.base()}/manager/rooms/${id}`, patch)
                .subscribe({ next: r => { try { sub.next(unwrap(r)); sub.complete(); } catch (e) { sub.error(e); } }, error: e => sub.error(e) });
        });
    }

    listManagers(): Observable<Manager[]> {
        if (this.isDemo()) return this.mock.listManagers();
        return new Observable(sub => {
            this.http.get<BaseResponse<Manager[]>>(`${this.base()}/owner/managers`)
                .subscribe({ next: r => { try { sub.next(unwrap(r)); sub.complete(); } catch (e) { sub.error(e); } }, error: e => sub.error(e) });
        });
    }

    listTenants(): Observable<Tenant[]> {
        if (this.isDemo()) return this.mock.listTenants();
        return new Observable(sub => {
            this.http.get<BaseResponse<Tenant[]>>(`${this.base()}/manager/tenants`)
                .subscribe({ next: r => { try { sub.next(unwrap(r)); sub.complete(); } catch (e) { sub.error(e); } }, error: e => sub.error(e) });
        });
    }

    ownerSummary(): Observable<OwnerSummary> {
        if (this.isDemo()) return this.mock.ownerSummary();
        return new Observable(sub => {
            this.http.get<BaseResponse<OwnerSummary>>(`${this.base()}/analytics/owner-summary`)
                .subscribe({ next: r => { try { sub.next(unwrap(r)); sub.complete(); } catch (e) { sub.error(e); } }, error: e => sub.error(e) });
        });
    }

    managerSummary(): Observable<ManagerSummary> {
        if (this.isDemo()) return this.mock.managerSummary();
        return new Observable(sub => {
            this.http.get<BaseResponse<ManagerSummary>>(`${this.base()}/analytics/manager-summary`)
                .subscribe({ next: r => { try { sub.next(unwrap(r)); sub.complete(); } catch (e) { sub.error(e); } }, error: e => sub.error(e) });
        });
    }

    tenantProfile(): Observable<Tenant> {
        if (this.isDemo()) return this.mock.tenantProfile();
        return new Observable(sub => {
            this.http.get<BaseResponse<Tenant>>(`${this.base()}/tenant/profile`)
                .subscribe({ next: r => { try { sub.next(unwrap(r)); sub.complete(); } catch (e) { sub.error(e); } }, error: e => sub.error(e) });
        });
    }

    _unused() { return throwError(() => new Error('unused')); }
}