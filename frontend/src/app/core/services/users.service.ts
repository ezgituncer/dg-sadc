import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom, Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Position,
  Role,
  Team,
  UserCreatePayload,
  UserListItem,
  UserUpdatePayload,
} from '../models/admin';

export interface UserFilters {
  roleId?: number | null;
  teamId?: number | null;
  isActive?: boolean | null;
  search?: string;
}

export interface UserDirectoryEntry {
  accountId: string;
  name: string;
  roleCode: string | null;
  teamId: number | null;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly base = environment.apiUrl;

  // Directory cache — small payload, every authenticated user can fetch it.
  private readonly _directory = signal<Map<string, UserDirectoryEntry>>(new Map());
  private directoryPromise: Promise<Map<string, UserDirectoryEntry>> | null = null;
  readonly directory = this._directory.asReadonly();

  constructor(private readonly http: HttpClient) {}

  list(filters: UserFilters = {}): Observable<UserListItem[]> {
    let params = new HttpParams();
    if (filters.roleId != null) params = params.set('role_id', String(filters.roleId));
    if (filters.teamId != null) params = params.set('team_id', String(filters.teamId));
    if (filters.isActive !== undefined && filters.isActive !== null) {
      params = params.set('is_active', filters.isActive ? 'true' : 'false');
    }
    if (filters.search) params = params.set('search', filters.search);
    return this.http.get<UserListItem[]>(`${this.base}/users`, { params });
  }

  /** Cached directory — accountId → minimal user info. Fetched lazily on first call. */
  loadDirectory(): Promise<Map<string, UserDirectoryEntry>> {
    if (this._directory().size > 0) {
      return Promise.resolve(this._directory());
    }
    if (this.directoryPromise) return this.directoryPromise;

    this.directoryPromise = firstValueFrom(
      this.http.get<UserDirectoryEntry[]>(`${this.base}/users/directory`),
    )
      .then((rows) => {
        const map = new Map(rows.map((r) => [r.accountId, r] as const));
        this._directory.set(map);
        this.directoryPromise = null;
        return map;
      })
      .catch((err) => {
        this.directoryPromise = null;
        throw err;
      });
    return this.directoryPromise;
  }

  /** O(1) lookup of a user's display name by accountId. Falls back to the id itself. */
  nameFor(accountId: string | null | undefined): string {
    if (!accountId) return '—';
    return this._directory().get(accountId)?.name ?? accountId;
  }

  get(id: number): Observable<UserListItem> {
    return this.http.get<UserListItem>(`${this.base}/users/${id}`);
  }

  create(payload: UserCreatePayload): Observable<UserListItem> {
    return this.http.post<UserListItem>(`${this.base}/users`, payload);
  }

  update(id: number, payload: UserUpdatePayload): Observable<UserListItem> {
    return this.http.patch<UserListItem>(`${this.base}/users/${id}`, payload);
  }

  resetPassword(id: number, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/users/${id}/reset-password`, {
      newPassword,
    });
  }

  softDelete(id: number): Observable<UserListItem> {
    return this.http.delete<UserListItem>(`${this.base}/users/${id}`);
  }

  activate(id: number): Observable<UserListItem> {
    return this.http.post<UserListItem>(`${this.base}/users/${id}/activate`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly base = environment.apiUrl;
  // Backed by /api/v1/roles. Codes are immutable in the backend (CLAUDE.md);
  // the management screen edits name + description only and there is no
  // create / delete endpoint.
  private readonly _cache = signal<Role[]>([]);
  private loadPromise: Promise<Role[]> | null = null;

  constructor(private readonly http: HttpClient) {
    this.load().catch(() => {});
  }

  list(): Role[] { return this._cache(); }
  byId(id: number | null | undefined): Role | undefined {
    return id == null ? undefined : this._cache().find((r) => r.id === id);
  }

  load(): Promise<Role[]> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = firstValueFrom(this.http.get<Role[]>(`${this.base}/roles`))
      .then((rows) => {
        this._cache.set(rows);
        this.loadPromise = null;
        return rows;
      })
      .catch((err) => {
        this.loadPromise = null;
        throw err;
      });
    return this.loadPromise;
  }

  update(id: number, payload: { name?: string; description?: string | null }): Observable<Role> {
    return this.http.patch<Role>(`${this.base}/roles/${id}`, payload).pipe(
      tap((updated) => {
        this._cache.update((arr) => arr.map((r) => (r.id === updated.id ? updated : r)));
      }),
    );
  }
}

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private readonly base = environment.apiUrl;
  // Backed by /api/v1/teams. Full CRUD with soft-delete.
  private readonly _cache = signal<Team[]>([]);
  private loadPromise: Promise<Team[]> | null = null;

  constructor(private readonly http: HttpClient) {
    this.load().catch(() => {});
  }

  list(): Team[] { return this._cache(); }
  byId(id: number | null | undefined): Team | undefined {
    return id == null ? undefined : this._cache().find((t) => t.id === id);
  }

  load(includeInactive = false): Promise<Team[]> {
    // The shared signal always holds only active teams — most callers (filters,
    // user form dropdowns) only want active. The management page re-fetches
    // with includeInactive itself.
    if (!includeInactive && this.loadPromise) return this.loadPromise;
    const params = includeInactive ? new HttpParams().set('include_inactive', 'true') : new HttpParams();
    const promise = firstValueFrom(this.http.get<Team[]>(`${this.base}/teams`, { params }))
      .then((rows) => {
        if (!includeInactive) this._cache.set(rows);
        return rows;
      });
    if (!includeInactive) this.loadPromise = promise.finally(() => { this.loadPromise = null; });
    return promise;
  }

  create(payload: { name: string; description?: string | null }): Observable<Team> {
    return this.http.post<Team>(`${this.base}/teams`, payload).pipe(
      tap((created) => {
        this._cache.update((arr) => [...arr, created]);
      }),
    );
  }

  update(id: number, payload: { name?: string; description?: string | null; isActive?: boolean }): Observable<Team> {
    return this.http.patch<Team>(`${this.base}/teams/${id}`, payload).pipe(
      tap((updated) => {
        this._cache.update((arr) => {
          const idx = arr.findIndex((t) => t.id === updated.id);
          if (idx < 0) return updated.isActive ? [...arr, updated] : arr;
          if (!updated.isActive) return arr.filter((t) => t.id !== updated.id);
          const copy = arr.slice();
          copy[idx] = updated;
          return copy;
        });
      }),
    );
  }

  softDelete(id: number): Observable<Team> {
    return this.http.delete<Team>(`${this.base}/teams/${id}`).pipe(
      tap(() => {
        this._cache.update((arr) => arr.filter((t) => t.id !== id));
      }),
    );
  }

  activate(id: number): Observable<Team> {
    return this.http.post<Team>(`${this.base}/teams/${id}/activate`, {}).pipe(
      tap((reactivated) => {
        this._cache.update((arr) => {
          if (arr.some((t) => t.id === reactivated.id)) {
            return arr.map((t) => (t.id === reactivated.id ? reactivated : t));
          }
          return [...arr, reactivated];
        });
      }),
    );
  }
}

@Injectable({ providedIn: 'root' })
export class PositionsService {
  private readonly base = environment.apiUrl;
  // Backed by /api/v1/positions. Drives the org hierarchy (independent from
  // roles, which are auth-only). Tree shape is captured by `parentPositionId`.
  private readonly _cache = signal<Position[]>([]);
  private loadPromise: Promise<Position[]> | null = null;

  constructor(private readonly http: HttpClient) {
    this.load().catch(() => {});
  }

  list(): Position[] { return this._cache(); }
  byId(id: number | null | undefined): Position | undefined {
    return id == null ? undefined : this._cache().find((p) => p.id === id);
  }
  /** Direct children of the given position (or roots when parentId is null). */
  childrenOf(parentId: number | null): Position[] {
    return this._cache().filter((p) => p.parentPositionId === parentId);
  }

  load(includeInactive = false): Promise<Position[]> {
    if (!includeInactive && this.loadPromise) return this.loadPromise;
    const params = includeInactive
      ? new HttpParams().set('include_inactive', 'true')
      : new HttpParams();
    const promise = firstValueFrom(
      this.http.get<Position[]>(`${this.base}/positions`, { params }),
    ).then((rows) => {
      if (!includeInactive) this._cache.set(rows);
      return rows;
    });
    if (!includeInactive) this.loadPromise = promise.finally(() => { this.loadPromise = null; });
    return promise;
  }

  create(payload: { name: string; parentPositionId: number | null; description?: string | null }): Observable<Position> {
    return this.http.post<Position>(`${this.base}/positions`, payload).pipe(
      tap((created) => this._cache.update((arr) => [...arr, created])),
    );
  }

  update(id: number, payload: { name?: string; parentPositionId?: number | null; description?: string | null; isActive?: boolean }): Observable<Position> {
    return this.http.patch<Position>(`${this.base}/positions/${id}`, payload).pipe(
      tap((updated) => {
        this._cache.update((arr) => {
          const idx = arr.findIndex((p) => p.id === updated.id);
          if (idx < 0) return updated.isActive ? [...arr, updated] : arr;
          if (!updated.isActive) return arr.filter((p) => p.id !== updated.id);
          const copy = arr.slice();
          copy[idx] = updated;
          return copy;
        });
      }),
    );
  }

  softDelete(id: number): Observable<Position> {
    return this.http.delete<Position>(`${this.base}/positions/${id}`).pipe(
      tap(() => this._cache.update((arr) => arr.filter((p) => p.id !== id))),
    );
  }

  activate(id: number): Observable<Position> {
    return this.http.post<Position>(`${this.base}/positions/${id}/activate`, {}).pipe(
      tap((reactivated) => {
        this._cache.update((arr) => {
          if (arr.some((p) => p.id === reactivated.id)) {
            return arr.map((p) => (p.id === reactivated.id ? reactivated : p));
          }
          return [...arr, reactivated];
        });
      }),
    );
  }
}
