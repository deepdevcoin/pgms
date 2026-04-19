import { Injectable, signal, computed } from '@angular/core';
import { Role, LoginResponse } from './models';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'pgms_token';
const USER_KEY = 'pgms_user';
const DEMO_KEY = 'pgms_demo_mode';
const API_KEY = 'pgms_api_base';

export interface StoredUser {
  userId: number;
  name: string;
  role: Role;
  isFirstLogin: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<StoredUser | null>(this.loadUser());
  user = this._user.asReadonly();
  role = computed(() => this._user()?.role ?? null);
  isAuthenticated = computed(() => !!this._user() && (this.demoMode || !!this.token));

  get token(): string | null { return localStorage.getItem(TOKEN_KEY); }
  get demoMode(): boolean {
    const stored = localStorage.getItem(DEMO_KEY);
    return stored === null ? environment.demoMode : stored === '1';
  }
  set demoMode(v: boolean) { localStorage.setItem(DEMO_KEY, v ? '1' : '0'); }
  get apiBase(): string { return localStorage.getItem(API_KEY) || environment.apiBaseUrl; }
  set apiBase(v: string) { localStorage.setItem(API_KEY, v); }

  private loadUser(): StoredUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) as StoredUser : null;
    } catch { return null; }
  }

  setSession(resp: LoginResponse) {
    if (resp.token) localStorage.setItem(TOKEN_KEY, resp.token);
    else localStorage.removeItem(TOKEN_KEY);
    const user: StoredUser = {
      userId: resp.userId,
      name: resp.name,
      role: resp.role,
      isFirstLogin: resp.isFirstLogin
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  updateFirstLoginDone() {
    const u = this._user();
    if (!u) return;
    const updated = { ...u, isFirstLogin: false };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    this._user.set(updated);
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
  }

  homeRouteFor(role: Role): string {
    return role === 'OWNER' ? '/owner/dashboard' : role === 'MANAGER' ? '/manager/dashboard' : '/tenant/dashboard';
  }
}
