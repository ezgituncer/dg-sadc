import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { YearlyReport, WorkingDaysResponse } from '../models/report';

export interface YearlyReportFilters {
  year: number;
  teamId?: number | null;
  projectId?: number | null;
  search?: string;
  includeBreakdown?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  yearlyReport(filters: YearlyReportFilters): Observable<YearlyReport> {
    let params = new HttpParams().set('year', String(filters.year));
    if (filters.teamId != null) params = params.set('team_id', String(filters.teamId));
    if (filters.projectId != null) params = params.set('project_id', String(filters.projectId));
    if (filters.search) params = params.set('search', filters.search);
    if (filters.includeBreakdown !== undefined) {
      params = params.set('include_breakdown', filters.includeBreakdown ? 'true' : 'false');
    }
    return this.http.get<YearlyReport>(`${this.base}/reports/yearly`, { params });
  }

  getWorkingDays(year: number): Observable<WorkingDaysResponse> {
    const params = new HttpParams().set('year', String(year));
    return this.http.get<WorkingDaysResponse>(`${this.base}/working-days`, { params });
  }

  saveWorkingDays(year: number, months: number[]): Observable<WorkingDaysResponse> {
    const params = new HttpParams().set('year', String(year));
    return this.http.patch<WorkingDaysResponse>(
      `${this.base}/working-days`,
      { months },
      { params },
    );
  }
}
