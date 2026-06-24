import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
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
  ChevronDown,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Users as UsersIcon,
} from 'lucide-angular';
import { Router } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartConfiguration, ChartData } from 'chart.js';
import { Workbook } from 'exceljs';

import { AuthService } from '../../core/services/auth.service';
import { LocaleService } from '../../core/services/locale.service';
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
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { isoDaysAgo, isoToday, isWithinEditWindow } from '../../shared/utils/date.utils';
import { environment } from '../../../environments/environment';

interface SortConfig {
  key: 'work_date' | 'hours_spent' | 'created_at' | 'id';
  direction: 'asc' | 'desc';
}

// Fetch the full filtered set in one request (server cap is 5000) so per-user
// totals are complete and no records are hidden by server-side paging.
const FETCH_ALL = 5000;
// Frontend pagination is by person/group, not by entry.
const GROUP_PAGE_SIZE = 25;

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
    TranslatePipe,
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
  private readonly localeSvc = inject(LocaleService);
  private readonly router = inject(Router);

  readonly icons = {
    Calendar, Search, Save, X, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronDown,
    TrendingUp, PieIcon, BarChart3, UsersIcon,
  };

  readonly today = isoToday();
  readonly thirtyDaysAgo = isoDaysAgo(30);

  readonly dateFrom = signal<string>(this.thirtyDaysAgo);
  readonly dateTo = signal<string>(this.today);
  // Multi-select: empty array means "all users".
  readonly accountIdFilter = signal<string[]>([]);

  // User picker popover state (mirrors the yearly-report picker).
  readonly userPickerOpen = signal(false);
  readonly userPickerFilter = signal('');
  readonly userPickerPos = signal<{ top: number; left: number } | null>(null);
  private readonly pickerTriggerRef = viewChild<ElementRef<HTMLButtonElement>>('pickerTrigger');
  readonly projectIdFilter = signal<number | null>(null);
  readonly activityTypeIdFilter = signal<number | null>(null);
  readonly taskTypeIdFilter = signal<number | null>(null);
  readonly statusFilter = signal<string>('');
  readonly complexityFilter = signal<string>('');
  readonly search = signal<string>('');
  /** Client-side: show only users whose total hours are below the expected target. */
  readonly belowExpectedOnly = signal(false);

  readonly page = signal(1);
  readonly sort = signal<SortConfig>({ key: 'work_date', direction: 'desc' });

  readonly entries = signal<WorkloadEntry[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  readonly aggregates = signal<WorkloadAggregates | null>(null);

  readonly toast = signal<{ message: string; kind: 'success' | 'error' } | null>(null);
  readonly confirmDeleteId = signal<number | null>(null);

  readonly currentUser = this.auth.currentUser;
  readonly isWorker = computed(() => this.auth.isWorker());

  readonly groupPageSize = GROUP_PAGE_SIZE;

  // --- Grouped-by-user view -------------------------------------------------
  // The table groups the fetched entries by person: one main row per user with
  // their total hours, expandable to reveal their individual workload entries.
  readonly expandedUsers = signal<Set<string>>(new Set());

  readonly groupedEntries = computed(() => {
    const groups = new Map<
      string,
      { accountId: string; name: string; totalHours: number; entries: WorkloadEntry[] }
    >();
    for (const e of this.entries()) {
      let g = groups.get(e.accountId);
      if (!g) {
        g = { accountId: e.accountId, name: this.users.nameFor(e.accountId), totalHours: 0, entries: [] };
        groups.set(e.accountId, g);
      }
      g.totalHours += parseFloat(e.hoursSpent) || 0;
      g.entries.push(e);
    }
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  });

  /** Expected hours for the selected date range = weekdays (Mon–Fri) × 8.
   *  Company-wide target shown as the denominator in each person's total. */
  readonly expectedHours = computed(() => {
    const from = this.dateFrom();
    const to = this.dateTo();
    if (!from || !to) return 0;
    const start = new Date(from + 'T00:00:00');
    const end = new Date(to + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    let workdays = 0;
    const d = new Date(start);
    while (d <= end) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) workdays++;
      d.setDate(d.getDate() + 1);
    }
    return workdays * 8;
  });

  toggleUser(accountId: string): void {
    this.expandedUsers.update((s) => {
      const next = new Set(s);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  }
  isUserExpanded(accountId: string): boolean {
    return this.expandedUsers().has(accountId);
  }

  /** Groups after the "below expected" client filter is applied. */
  readonly visibleGroups = computed(() => {
    const groups = this.groupedEntries();
    if (!this.belowExpectedOnly()) return groups;
    const expected = this.expectedHours();
    return groups.filter((g) => g.totalHours < expected);
  });

  // Pagination is over user groups, computed client-side from the full set.
  readonly totalGroups = computed(() => this.visibleGroups().length);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalGroups() / this.groupPageSize)),
  );
  readonly pagedGroups = computed(() => {
    const groups = this.visibleGroups();
    const ps = this.groupPageSize;
    const p = Math.min(this.page(), Math.max(1, Math.ceil(groups.length / ps)));
    const start = (p - 1) * ps;
    return groups.slice(start, start + ps);
  });

  /** Directory users (sorted, optionally filtered by the picker search box) —
   *  populates the user multi-select. Reading the directory signal keeps this
   *  reactive; it picks up the first time the service finishes its lazy fetch
   *  in AppShell.ngOnInit. */
  readonly directoryUsers = computed(() => {
    const map = this.users.directory();
    const items = Array.from(map.values());
    const filter = this.userPickerFilter().trim().toLowerCase();
    const filtered = filter
      ? items.filter(
          (u) =>
            u.name.toLowerCase().includes(filter) ||
            u.accountId.toLowerCase().includes(filter),
        )
      : items;
    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  });

  readonly selectedUserCount = computed(() => this.accountIdFilter().length);

  userPickerLabel(): string {
    const n = this.selectedUserCount();
    if (n === 0) return this.localeSvc.t('workload_list.user_all');
    if (n === 1) return this.localeSvc.t('workload_list.users_selected_one');
    return this.localeSvc.t('workload_list.users_selected_many', { count: n });
  }

  toggleUserPicker(): void {
    const next = !this.userPickerOpen();
    this.userPickerOpen.set(next);
    if (next) {
      this.recomputePickerPosition();
    } else {
      this.userPickerFilter.set('');
    }
  }

  closeUserPicker(): void {
    this.userPickerOpen.set(false);
    this.userPickerFilter.set('');
  }

  private recomputePickerPosition(): void {
    const el = this.pickerTriggerRef()?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const popoverWidth = 320;
    const left = Math.max(
      8,
      Math.min(window.innerWidth - popoverWidth - 8, rect.right - popoverWidth),
    );
    this.userPickerPos.set({ top: rect.bottom + 6, left });
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onWindowChange(): void {
    if (!this.userPickerOpen()) return;
    this.recomputePickerPosition();
  }

  toggleUserSelection(accountId: string): void {
    this.accountIdFilter.update((arr) =>
      arr.includes(accountId) ? arr.filter((id) => id !== accountId) : [...arr, accountId],
    );
    this.page.set(1);
  }

  isUserSelected(accountId: string): boolean {
    return this.accountIdFilter().includes(accountId);
  }

  clearUserSelection(): void {
    this.accountIdFilter.set([]);
    this.page.set(1);
  }

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
    if (this.accountIdFilter().length > 0) n++;
    if (this.projectIdFilter() !== null) n++;
    if (this.activityTypeIdFilter() !== null) n++;
    if (this.taskTypeIdFilter() !== null) n++;
    if (this.statusFilter()) n++;
    if (this.complexityFilter()) n++;
    if (this.search().trim()) n++;
    if (this.belowExpectedOnly()) n++;
    return n;
  });

  toggleBelowExpected(): void {
    this.belowExpectedOnly.update((v) => !v);
    this.page.set(1);
  }

  constructor() {
    // Reload whenever any filter or sort changes. Pagination is client-side
    // (over user groups), so page changes do NOT refetch — we always pull the
    // full filtered set so per-user totals are complete.
    effect(() => {
      const ids = this.accountIdFilter();
      const filters: WorkloadEntryFilters = {
        accountId: ids.length > 0 ? ids : undefined,
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
        page: 1,
        pageSize: FETCH_ALL,
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
    this.accountIdFilter.set([]);
    this.projectIdFilter.set(null);
    this.activityTypeIdFilter.set(null);
    this.taskTypeIdFilter.set(null);
    this.statusFilter.set('');
    this.complexityFilter.set('');
    this.search.set('');
    this.belowExpectedOnly.set(false);
    this.dateFrom.set(this.thirtyDaysAgo);
    this.dateTo.set(this.today);
    this.page.set(1);
  }

  async exportExcel(): Promise<void> {
    // Export the full filtered set (entries() holds all matching rows), with
    // human-readable names instead of ids + in-cell dropdowns. Workers' set is
    // already own-only.
    const rows = this.entries();
    if (rows.length === 0) return;

    const GREEN = 'FF76933C';

    const wb = new Workbook();
    const ws = wb.addWorksheet('Workload');
    ws.columns = [
      { key: 'user', width: 36 },
      { key: 'date', width: 16 },
      { key: 'activity', width: 30 },
      { key: 'category', width: 30 },
      { key: 'project', width: 30 },
      { key: 'description', width: 72 },
      { key: 'status', width: 18 },
      { key: 'complexity', width: 18 },
      { key: 'hours', width: 10 },
      { key: 'target', width: 12 },
      { key: 'quantity', width: 10 },
    ];
    ws.properties.outlineProperties = { summaryBelow: false, summaryRight: false };

    // Center all texts (Description stays left + wrapped for readability).
    ws.columns.forEach((c) => {
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getColumn('description').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    // Title row (row 1) — "SADC Workload {date range}", themed to match the headers.
    ws.mergeCells('A1:K1');
    const title = ws.getCell('A1');
    title.value = `SADC Workload ${this.dateFrom()} – ${this.dateTo()}`;
    title.font = { bold: true, size: 14, color: { argb: 'FF4F6228' } };
    title.alignment = { vertical: 'middle', horizontal: 'center' };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC4D79B' } };
    ws.getRow(1).height = 24;

    // Column header row (row 2).
    const headerRow = ws.addRow({
      user: 'User', date: 'Date', activity: 'Activity', category: 'Category',
      project: 'Project', description: 'Description', status: 'Status',
      complexity: 'Complexity', hours: 'Hours', target: 'Target', quantity: 'Quantity',
    });
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell({ includeEmpty: true }, (c) => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
    });

    // Mirror the listing's grouped table: one header row per user (name + total
    // hours) with their entries as collapsible detail rows beneath it.
    const groups = new Map<string, WorkloadEntry[]>();
    for (const e of rows) {
      const name = this.users.nameFor(e.accountId);
      const g = groups.get(name);
      if (g) g.push(e);
      else groups.set(name, [e]);
    }
    const userNames = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, 'tr'));

    const detailRowNumbers: number[] = [];
    for (const name of userNames) {
      const entries = groups
        .get(name)!
        .slice()
        .sort((a, b) => a.workDate.localeCompare(b.workDate));
      const total = entries.reduce((s, e) => s + (parseFloat(e.hoursSpent) || 0), 0);

      // Group header row: name + total (like the listing's main row).
      const gh = ws.addRow({
        user: name,
        description: `${entries.length} entries`,
        hours: Math.round(total * 100) / 100,
        target: this.expectedHours(),
      });
      gh.outlineLevel = 0;
      gh.eachCell({ includeEmpty: true }, (c) => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
      });

      // Detail rows (User left blank — it's shown in the group header).
      for (const e of entries) {
        const row = ws.addRow({
          date: e.workDate,
          activity: this.activityName(e.activityTypeId),
          category: this.categoryFor(e)?.name ?? '',
          project: this.projectName(e.projectId),
          description: e.taskDescription,
          status: e.status,
          complexity: e.complexity,
          hours: parseFloat(e.hoursSpent) || 0,
          quantity: e.quantity ?? '',
        });
        row.outlineLevel = 1;
        row.eachCell({ includeEmpty: true }, (c) => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };
        });
        detailRowNumbers.push(row.number);
      }
    }

    // In-cell dropdowns on the detail rows (constrained-value columns).
    const distinct = (fn: (e: WorkloadEntry) => string | null | undefined): string[] =>
      Array.from(new Set(rows.map(fn).filter((v): v is string => !!v))).sort((a, b) =>
        a.localeCompare(b, 'tr'),
      );
    const activityList = distinct((e) => this.activityName(e.activityTypeId));
    const categoryList = distinct((e) => this.categoryFor(e)?.name);
    const projectList = distinct((e) => this.projectName(e.projectId));

    const lists = wb.addWorksheet('Lists');
    lists.state = 'veryHidden';
    const fill = (col: string, arr: string[]) =>
      arr.forEach((v, i) => {
        lists.getCell(`${col}${i + 1}`).value = v;
      });
    fill('A', activityList);
    fill('B', categoryList);
    fill('C', projectList);

    const ref = (col: string, n: number) => [`Lists!$${col}$1:$${col}$${Math.max(n, 1)}`];
    for (const rn of detailRowNumbers) {
      ws.getCell(`C${rn}`).dataValidation = { type: 'list', allowBlank: true, formulae: ref('A', activityList.length) };
      ws.getCell(`D${rn}`).dataValidation = { type: 'list', allowBlank: true, formulae: ref('B', categoryList.length) };
      ws.getCell(`E${rn}`).dataValidation = { type: 'list', allowBlank: true, formulae: ref('C', projectList.length) };
      ws.getCell(`G${rn}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"ongoing,completed,blocked"'] };
      ws.getCell(`H${rn}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"low,medium,high"'] };
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workload-export-${this.today}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.flashToast(this.localeSvc.t('workload_list.csv_done', { count: rows.length }), 'success');
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
        this.flashToast(this.localeSvc.t('common.deleted'), 'success');
        this.refetch();
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : this.localeSvc.t('common.failed_delete'), 'error');
      },
    });
  }

  private refetch(): void {
    const ids = this.accountIdFilter();
    this.fetch({
      accountId: ids.length > 0 ? ids : undefined,
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
      page: 1,
      pageSize: FETCH_ALL,
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
  taskTypeName(id: number | null): string {
    if (id == null) return '—';
    return this.lookups.findTaskType(id)?.name ?? '—';
  }
  canEditEntry(entry: WorkloadEntry): boolean {
    // Anyone may edit/delete THEIR OWN entries within the 30-day window
    // (the backend enforces both ownership and the window as well).
    return (
      entry.accountId === this.currentUser()?.accountId &&
      isWithinEditWindow(entry.workDate)
    );
  }

  /** Open the entry form for this entry (only allowed within the 30-day window). */
  editEntry(entry: WorkloadEntry): void {
    this.router.navigate(['/workload-entry'], {
      queryParams: { date: entry.workDate, edit: entry.id },
    });
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
