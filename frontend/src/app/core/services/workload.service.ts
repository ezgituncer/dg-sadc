import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  WorkloadAggregates,
  WorkloadEntry,
  WorkloadEntryCreate,
  WorkloadEntryFilters,
  WorkloadEntryListResponse,
  WorkloadEntryUpdate,
} from '../models/workload';

@Injectable({ providedIn: 'root' })
export class WorkloadService {
  private readonly base = environment.apiUrl + '/workload-entries';

  constructor(private readonly http: HttpClient) {}

  list(filters: WorkloadEntryFilters = {}): Observable<WorkloadEntryListResponse> {
    return this.http.get<WorkloadEntryListResponse>(this.base, {
      params: this.buildParams(filters),
    });
  }

  get(id: number): Observable<WorkloadEntry> {
    return this.http.get<WorkloadEntry>(`${this.base}/${id}`);
  }

  create(payload: WorkloadEntryCreate): Observable<WorkloadEntry> {
    return this.http.post<WorkloadEntry>(this.base, payload);
  }

  update(id: number, payload: WorkloadEntryUpdate): Observable<WorkloadEntry> {
    return this.http.patch<WorkloadEntry>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  aggregates(filters: WorkloadEntryFilters = {}): Observable<WorkloadAggregates> {
    // Strip pagination/sort fields — aggregates don't use them.
    const { sort, direction, page, pageSize, ...rest } = filters;
    return this.http.get<WorkloadAggregates>(`${this.base}/aggregates`, {
      params: this.buildParams(rest),
    });
  }

  exportUrl(filters: WorkloadEntryFilters = {}): string {
    const params = this.buildParams(filters);
    const qs = params.keys().length ? `?${params.toString()}` : '';
    return `${this.base}/export${qs}`;
  }

  private buildParams(filters: WorkloadEntryFilters): HttpParams {
    let params = new HttpParams();

    // account_id is multi-valued — emit one query param per selected user so the
    // backend can read it as `list[str]`.
    if (filters.accountId && filters.accountId.length > 0) {
      for (const id of filters.accountId) {
        if (id) params = params.append('account_id', id);
      }
    }

    const map: Record<string, string | number | undefined> = {
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      project_id: filters.projectId,
      activity_type_id: filters.activityTypeId,
      task_type_id: filters.taskTypeId,
      status: filters.status,
      complexity: filters.complexity,
      search: filters.search,
      sort: filters.sort,
      direction: filters.direction,
      page: filters.page,
      page_size: filters.pageSize,
    };
    for (const [k, v] of Object.entries(map)) {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    }
    return params;
  }
}
