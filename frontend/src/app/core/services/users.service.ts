import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom, Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
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
  // Seeded roles + any added at runtime. Stored in a signal so list views update reactively.
  // Note: there is no backend endpoint for role CRUD — additions live for the session only.
  private readonly _cache = signal<Role[]>([
    { id: 1, code: 'ADMIN',         name: 'Admin',           description: 'Tam yetki',          createdAt: '' },
    { id: 2, code: 'HR',            name: 'HR',              description: 'İnsan kaynakları',   createdAt: '' },
    { id: 3, code: 'MANAGER',       name: 'Manager',         description: 'Yönetici',           createdAt: '' },
    { id: 4, code: 'TECH_LEAD',     name: 'Technical Lead',  description: 'Teknik lider',       createdAt: '' },
    { id: 5, code: 'QA_SPECIALIST', name: 'QA Specialist',   description: 'Kalite uzmanı',      createdAt: '' },
    { id: 6, code: 'WORKER',        name: 'Worker',          description: 'Çalışan',            createdAt: '' },
  ]);

  list(): Role[] { return this._cache(); }
  byId(id: number | null | undefined): Role | undefined {
    return id == null ? undefined : this._cache().find((r) => r.id === id);
  }

  add(name: string, code?: string, description?: string): Role {
    const normalized = (code ?? name).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    const next: Role = {
      id: Math.max(0, ...this._cache().map((r) => r.id)) + 1,
      code: normalized || `ROLE_${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || null,
      createdAt: new Date().toISOString(),
    };
    this._cache.update((arr) => [...arr, next]);
    return next;
  }
}

@Injectable({ providedIn: 'root' })
export class TeamsService {
  // Seeded teams + any added at runtime. Same caveat as RolesService — no backend persistence.
  private readonly _cache = signal<Team[]>([
    { id: 1, name: 'Engineering', description: null, isActive: true, createdAt: '', updatedAt: '' },
    { id: 2, name: 'Product',     description: null, isActive: true, createdAt: '', updatedAt: '' },
    { id: 3, name: 'Design',      description: null, isActive: true, createdAt: '', updatedAt: '' },
    { id: 4, name: 'QA',          description: null, isActive: true, createdAt: '', updatedAt: '' },
    { id: 5, name: 'DevOps',      description: null, isActive: true, createdAt: '', updatedAt: '' },
    { id: 6, name: 'Marketing',   description: null, isActive: true, createdAt: '', updatedAt: '' },
  ]);

  list(): Team[] { return this._cache(); }
  byId(id: number | null | undefined): Team | undefined {
    return id == null ? undefined : this._cache().find((t) => t.id === id);
  }

  add(name: string, description?: string): Team {
    const now = new Date().toISOString();
    const next: Team = {
      id: Math.max(0, ...this._cache().map((t) => t.id)) + 1,
      name: name.trim(),
      description: description?.trim() || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this._cache.update((arr) => [...arr, next]);
    return next;
  }
}
