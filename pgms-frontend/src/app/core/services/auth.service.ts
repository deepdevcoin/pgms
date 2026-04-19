import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { AuthSession, UserRole } from '../models/auth.model';

const SESSION_STORAGE_KEY = 'pgms.session';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(this.readSession());

  readonly session$: Observable<AuthSession | null> = this.sessionSubject.asObservable();

  get session(): AuthSession | null {
    return this.sessionSubject.value;
  }

  get token(): string | null {
    return this.session?.token ?? null;
  }

  get userRole(): UserRole | null {
    return this.session?.role ?? null;
  }

  get isAuthenticated(): boolean {
    return Boolean(this.token);
  }

  setSession(session: AuthSession): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  clearSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.sessionSubject.next(null);
  }

  hasRole(roles: UserRole[]): boolean {
    const currentRole = this.userRole;
    return !!currentRole && roles.includes(currentRole);
  }

  private readSession(): AuthSession | null {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!rawSession) {
      return null;
    }

    try {
      return JSON.parse(rawSession) as AuthSession;
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }
}
