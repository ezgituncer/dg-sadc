import { computed, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CurrentUser } from '../models/user';
import { RoleCode } from '../models/role';

const TOKEN_KEY = 'workload.token';
const USER_KEY = 'workload.user';

interface LoginResponse {
  accessToken: string;
  user: CurrentUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser = signal<CurrentUser | null>(this.readUser());
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly roleCode = computed<RoleCode | null>(() => this._currentUser()?.roleCode ?? null);
  readonly isSuperuser = computed(() => this._currentUser()?.isSuperuser ?? false);
  /** Effective permission set as a Set for O(1) lookups. */
  readonly permissions = computed<Set<string>>(
    () => new Set(this._currentUser()?.permissions ?? []),
  );

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  login(accountId: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { accountId, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.accessToken);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this._currentUser.set(res.user);
        }),
      );
  }

  logout(redirect = true): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._currentUser.set(null);
    if (redirect) this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  hasRole(...allowed: RoleCode[]): boolean {
    const role = this.roleCode();
    return role !== null && allowed.includes(role);
  }

  isWorker(): boolean {
    return this.roleCode() === 'WORKER';
  }

  /** True if the user holds ANY of the given permission codes (superuser → always true). */
  hasPermission(...codes: string[]): boolean {
    if (this.isSuperuser()) return true;
    const perms = this.permissions();
    return codes.some((c) => perms.has(c));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/change-password`, {
      currentPassword,
      newPassword,
    });
  }

  refreshFromServer(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${environment.apiUrl}/auth/me`).pipe(
      tap((user) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this._currentUser.set(user);
      }),
    );
  }

  private readUser(): CurrentUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  }
}
