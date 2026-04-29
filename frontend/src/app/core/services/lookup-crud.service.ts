import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type LookupKind =
  | 'projects'
  | 'activity-types'
  | 'task-types'
  | 'project-categories'
  | 'non-project-categories'
  | 'self-imp-categories';

export interface LookupListItem {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LookupCreatePayload {
  code: string;
  name: string;
  description?: string;
  color?: string;
}

export interface LookupUpdatePayload {
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

/** A thin wrapper that lets a single Lookups page hit any of the 6 endpoints. */
@Injectable({ providedIn: 'root' })
export class LookupCrudService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  list(kind: LookupKind, includeInactive = false): Observable<LookupListItem[]> {
    const params = includeInactive
      ? new HttpParams().set('include_inactive', 'true')
      : new HttpParams();
    return this.http.get<LookupListItem[]>(`${this.base}/${kind}`, { params });
  }

  create(kind: LookupKind, payload: LookupCreatePayload): Observable<LookupListItem> {
    return this.http.post<LookupListItem>(`${this.base}/${kind}`, payload);
  }

  update(kind: LookupKind, id: number, payload: LookupUpdatePayload): Observable<LookupListItem> {
    return this.http.patch<LookupListItem>(`${this.base}/${kind}/${id}`, payload);
  }

  softDelete(kind: LookupKind, id: number): Observable<LookupListItem> {
    return this.http.delete<LookupListItem>(`${this.base}/${kind}/${id}`);
  }

  activate(kind: LookupKind, id: number): Observable<LookupListItem> {
    return this.http.post<LookupListItem>(`${this.base}/${kind}/${id}/activate`, {});
  }

  usage(kind: LookupKind, id: number): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/${kind}/${id}/usage`);
  }
}
