import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Calendar,
  Search,
  Save,
  X,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
} from 'lucide-angular';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartConfiguration, ChartData } from 'chart.js';

import { AuthService } from '../../core/services/auth.service';
import { LookupService } from '../../core/services/lookup.service';
import { UsersService } from '../../core/services/users.service';
import { WorkloadService } from '../../core/services/workload.service';
import {
  WorkloadAggregates,
  WorkloadEntry,
  WorkloadEntryFilters,
} from '../../core/models/workload';
import { ToastComponent } from '../../shared/components/toast.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { isoDaysAgo, isoToday, isWithinEditWindow } from '../../shared/utils/date.utils';
import { environment } from '../../../environments/environment';

interface SortConfig {
  key: 'work_date' | 'hours_spent' | 'created_at' | 'id';
  direction: 'asc' | 'desc';
}

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

@Component({
  selector: 'app-workload-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ToastComponent,
    ConfirmDialogComponent,
    BaseChartDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workload-list.component.html',
  styleUrl: './workload-list.component.css',
})
export class WorkloadListComponent {
  private readonly auth = inject(AuthService);
  protected readonly lookups = inject(LookupService);
  protected readonly users = inject(UsersService);
  private readonly api = inject(WorkloadService);

  readonly icons = {
    Calendar, Search, Save, X, Edit2, Trash2, ChevronLeft, ChevronRight,
    TrendingUp, PieIcon, BarChart3,
  };

  readonly today = isoToday();
  readonly thirtyDaysAgo = isoDaysAgo(30);

  readonly dateFrom = signal<string>(this.thirtyDaysAgo);
  readonly dateTo = signal<string>(this.today);
  readonly accountIdFilter = signal<string>('');
  readonly projectIdFilter = signal<number | null>(null);
  readonly activityTypeIdFilter = signal<number | null>(null);
  readonly taskTypeIdFilter = signal<number | null>(null);
  readonly statusFilter = signal<string>('');
  readonly complexityFilter = signal<string>('');
  readonly search = signal<string>('');

  readonly page = signal(1);
  readonly pageSize = signal<number>(20);
  readonly sort = signal<SortConfig>({ key: 'work_date', direction: 'desc' });

  readonly entries = signal<WorkloadEntry[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  readonly aggregates = signal<WorkloadAggregates | null>(null);

  readonly toast = signal<{ message: string; kind: 'success' | 'error' } | null>(null);
  readonly confirmDeleteId = signal<number | null>(null);

  readonly currentUser = this.auth.currentUser;
  readonly isWorker = computed(() => this.auth.isWorker());

  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  readonly totalPages = computed(() => {
    const t = this.total();
    const ps = this.pageSize();
    return Math.max(1, Math.ceil(t / ps));
  });

  // KPI cards driven by the aggregate endpoint (full filtered set, not just one page).
  readonly kpis = computed(() => {
    const agg = this.aggregates();
    if (!agg) {
      return { totalEntries: 0, totalHours: '0.0', uniqueProjects: 0, avgPerDay: '0.0' };
    }
    const totalHours = parseFloat(agg.totalHours) || 0;
    const activeDays = agg.byDate.filter((d) => parseFloat(d.hours) > 0).length;
    const avgPerDay = activeDays > 0 ? totalHours / activeDays : 0;
    return {
      totalEntries: agg.totalEntries,
      totalHours: totalHours.toFixed(1),
      uniqueProjects: agg.byProject.length,
      avgPerDay: avgPerDay.toFixed(1),
    };
  });

  // --- Chart data ---------------------------------------------------------

  // Palette borrowed from the mock — color projects deterministically.
  private readonly palette = [
    '#2DD4BF', '#3B82F6', '#A78BFA', '#F59E0B', '#EC4899',
    '#10B981', '#EF4444', '#06B6D4',
  ];

  readonly trendChartData = computed<ChartData<'line'>>(() => {
    const series = this.aggregates()?.byDate ?? [];
    const labels = series.map((p) => this.formatDateShort(p.date));
    const data = series.map((p) => parseFloat(p.hours) || 0);
    return {
      labels,
      datasets: [
        {
          data,
          label: 'Saat',
          borderColor: '#2DD4BF',
          backgroundColor: 'rgba(45, 212, 191, 0.20)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
      ],
    };
  });

  readonly projectChartData = computed<ChartData<'doughnut'>>(() => {
    const rows = this.aggregates()?.byProject ?? [];
    return {
      labels: rows.map((r) => r.name),
      datasets: [
        {
          data: rows.map((r) => parseFloat(r.hours) || 0),
          backgroundColor: rows.map((_, i) => this.palette[i % this.palette.length]),
          borderColor: 'rgba(15, 31, 58, 0.9)',
          borderWidth: 1,
        },
      ],
    };
  });

  readonly activityChartData = computed<ChartData<'bar'>>(() => {
    const rows = this.aggregates()?.byActivity ?? [];
    const colorMap: Record<number, string> = {
      1: '#2DD4BF',
      2: '#F59E0B',
      3: '#A78BFA',
    };
    return {
      labels: rows.map((r) => r.name),
      datasets: [
        {
          data: rows.map((r) => parseFloat(r.hours) || 0),
          label: 'Saat',
          backgroundColor: rows.map((r) => colorMap[r.activityTypeId] ?? '#3B82F6'),
          borderRadius: 4,
        },
      ],
    };
  });

  readonly chartHasData = computed(() => {
    const agg = this.aggregates();
    return agg !== null && agg.totalEntries > 0;
  });

  readonly trendChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.10)' }, ticks: { color: '#64748B', font: { size: 10 } } },
    },
  };

  readonly projectChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#94A3B8', font: { size: 10 }, boxWidth: 10 },
      },
    },
  };

  readonly activityChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.10)' }, ticks: { color: '#64748B', font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 11 } } },
    },
  };

  private formatDateShort(iso: string): string {
    const [, m, d] = iso.split('-');
    const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1] ?? ''}`;
  }

  readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.accountIdFilter()) n++;
    if (this.projectIdFilter() !== null) n++;
    if (this.activityTypeIdFilter() !== null) n++;
    if (this.taskTypeIdFilter() !== null) n++;
    if (this.statusFilter()) n++;
    if (this.complexityFilter()) n++;
    if (this.search().trim()) n++;
    return n;
  });

  constructor() {
    // Reload whenever any filter, sort or page changes.
    effect(() => {
      // Touch every signal so the effect tracks them all.
      const filters: WorkloadEntryFilters = {
        accountId: this.accountIdFilter() || undefined,
        dateFrom: this.dateFrom() || undefined,
        dateTo: this.dateTo() || undefined,
        projectId: this.projectIdFilter() ?? undefined,
        activityTypeId: this.activityTypeIdFilter() ?? undefined,
        taskTypeId: this.taskTypeIdFilter() ?? undefined,
        status: (this.statusFilter() || undefined) as WorkloadEntryFilters['status'],
        complexity: (this.complexityFilter() || undefined) as WorkloadEntryFilters['complexity'],
        search: this.search().trim() || undefined,
        sort: this.sort().key,
        direction: this.sort().direction,
        page: this.page(),
        pageSize: this.pageSize(),
      };
      this.fetch(filters);
    });
  }

  private fetch(filters: WorkloadEntryFilters): void {
    this.loading.set(true);
    this.api.list(filters).subscribe({
      next: (res) => {
        this.entries.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.entries.set([]);
        this.total.set(0);
        this.loading.set(false);
      },
    });
    // Fire the aggregate fetch in parallel — it powers the KPIs and the 3 charts.
    this.api.aggregates(filters).subscribe({
      next: (agg) => this.aggregates.set(agg),
      error: () => this.aggregates.set(null),
    });
  }

  toggleSort(key: SortConfig['key']): void {
    const current = this.sort();
    if (current.key === key) {
      this.sort.set({
        key,
        direction: current.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      this.sort.set({ key, direction: 'desc' });
    }
    this.page.set(1);
  }

  setPage(p: number): void {
    this.page.set(Math.max(1, Math.min(p, this.totalPages())));
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  presetToday(): void {
    this.dateFrom.set(this.today);
    this.dateTo.set(this.today);
    this.page.set(1);
  }
  presetSevenDays(): void {
    this.dateFrom.set(isoDaysAgo(7));
    this.dateTo.set(this.today);
    this.page.set(1);
  }
  presetThirtyDays(): void {
    this.dateFrom.set(this.thirtyDaysAgo);
    this.dateTo.set(this.today);
    this.page.set(1);
  }

  clearFilters(): void {
    this.accountIdFilter.set('');
    this.projectIdFilter.set(null);
    this.activityTypeIdFilter.set(null);
    this.taskTypeIdFilter.set(null);
    this.statusFilter.set('');
    this.complexityFilter.set('');
    this.search.set('');
    this.dateFrom.set(this.thirtyDaysAgo);
    this.dateTo.set(this.today);
    this.page.set(1);
  }

  exportCsv(): void {
    const filters: WorkloadEntryFilters = {
      accountId: this.accountIdFilter() || undefined,
      dateFrom: this.dateFrom() || undefined,
      dateTo: this.dateTo() || undefined,
      projectId: this.projectIdFilter() ?? undefined,
      activityTypeId: this.activityTypeIdFilter() ?? undefined,
      taskTypeId: this.taskTypeIdFilter() ?? undefined,
      status: (this.statusFilter() || undefined) as WorkloadEntryFilters['status'],
      complexity: (this.complexityFilter() || undefined) as WorkloadEntryFilters['complexity'],
      search: this.search().trim() || undefined,
    };

    // The export endpoint requires the auth header, so fetch as a blob and download.
    const url = this.api.exportUrl(filters);
    const token = this.auth.getToken();
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => {
        if (!res.ok) throw new Error(`Export failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `workload-export-${this.today}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        this.flashToast(`${this.total()} kayıt CSV olarak indirildi`, 'success');
      })
      .catch(() => {
        this.flashToast('CSV indirme başarısız', 'error');
      });
  }

  askDelete(id: number): void {
    this.confirmDeleteId.set(id);
  }
  cancelDelete(): void {
    this.confirmDeleteId.set(null);
  }
  confirmDelete(): void {
    const id = this.confirmDeleteId();
    if (id == null) return;
    this.confirmDeleteId.set(null);
    this.api.delete(id).subscribe({
      next: () => {
        this.flashToast('Kayıt silindi', 'success');
        this.refetch();
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : 'Silinemedi', 'error');
      },
    });
  }

  private refetch(): void {
    // Bumping page within bounds re-triggers the effect.
    const p = this.page();
    this.page.set(p === 1 ? 1 : p);
    // Force trigger by toggling
    this.page.update((x) => x);
    // Simpler: just call fetch directly.
    this.fetch({
      accountId: this.accountIdFilter() || undefined,
      dateFrom: this.dateFrom() || undefined,
      dateTo: this.dateTo() || undefined,
      projectId: this.projectIdFilter() ?? undefined,
      activityTypeId: this.activityTypeIdFilter() ?? undefined,
      taskTypeId: this.taskTypeIdFilter() ?? undefined,
      status: (this.statusFilter() || undefined) as WorkloadEntryFilters['status'],
      complexity: (this.complexityFilter() || undefined) as WorkloadEntryFilters['complexity'],
      search: this.search().trim() || undefined,
      sort: this.sort().key,
      direction: this.sort().direction,
      page: this.page(),
      pageSize: this.pageSize(),
    });
  }

  private flashToast(message: string, kind: 'success' | 'error'): void {
    this.toast.set({ message, kind });
    setTimeout(() => this.toast.set(null), 2500);
  }

  // --- Lookup helpers used in the template ---
  activityName(id: number): string {
    return this.lookups.findActivityType(id)?.name ?? '—';
  }
  projectName(id: number | null): string {
    if (id == null) return '—';
    return this.lookups.findProject(id)?.name ?? `Project ${id}`;
  }
  categoryFor(entry: WorkloadEntry) {
    return this.lookups.findCategory(entry.activityTypeId, entry.categoryId);
  }
  taskTypeName(id: number): string {
    return this.lookups.findTaskType(id)?.name ?? '—';
  }
  canEditEntry(entry: WorkloadEntry): boolean {
    if (this.isWorker()) {
      // Workers can never edit/delete from the listings (per TASK.md).
      return false;
    }
    // Non-workers can only edit/delete their own entries (company policy).
    return (
      entry.accountId === this.currentUser()?.accountId &&
      isWithinEditWindow(entry.workDate)
    );
  }
  isOwn(entry: WorkloadEntry): boolean {
    return entry.accountId === this.currentUser()?.accountId;
  }
  paginationWindow(): number[] {
    const total = this.totalPages();
    const current = this.page();
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    const realStart = Math.max(1, end - 4);
    const out: number[] = [];
    for (let i = realStart; i <= end; i++) out.push(i);
    return out;
  }
}
