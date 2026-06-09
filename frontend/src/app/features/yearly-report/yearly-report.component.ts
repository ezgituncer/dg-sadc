import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  effect,
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
  Edit2,
  Plus,
  X,
  AlertCircle,
  Users as UsersIcon,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { LocaleService } from '../../core/services/locale.service';
import { LookupService } from '../../core/services/lookup.service';
import { ReportService } from '../../core/services/report.service';
import { TeamsService, UsersService } from '../../core/services/users.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { YearlyReport } from '../../core/models/report';
import {
  getCellTone,
  TONE_STYLES,
  TR_MONTHS_FULL,
  TR_MONTHS_SHORT,
} from '../../shared/utils/cell-tone';
import { ToastComponent } from '../../shared/components/toast.component';
import { WorkingDaysEditorComponent } from './working-days-editor.component';

@Component({
  selector: 'app-yearly-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ToastComponent,
    WorkingDaysEditorComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './yearly-report.component.html',
  styleUrl: './yearly-report.component.css',
})
export class YearlyReportComponent {
  private readonly auth = inject(AuthService);
  protected readonly lookups = inject(LookupService);
  protected readonly teams = inject(TeamsService);
  protected readonly usersDir = inject(UsersService);
  private readonly reportApi = inject(ReportService);
  private readonly localeSvc = inject(LocaleService);

  readonly icons = { Calendar, Search, Save, Edit2, Plus, X, AlertCircle, UsersIcon, Check, ChevronLeft, ChevronRight };
  readonly trMonths = TR_MONTHS_SHORT;
  readonly trMonthsFull = TR_MONTHS_FULL;

  readonly currentYear = new Date().getFullYear();
  readonly availableYears = (() => {
    const years: number[] = [];
    for (let y = this.currentYear - 2; y <= this.currentYear + 1; y++) years.push(y);
    return years.reverse();
  })();

  // --- filters ---
  readonly year = signal(this.currentYear);
  readonly teamFilter = signal<number | null>(null);
  readonly projectFilter = signal<number | null>(null);
  readonly includeBreakdown = signal(true);

  // User multi-select: empty Set means "all users"; otherwise show only these accountIds.
  readonly selectedAccountIds = signal<Set<string>>(new Set());

  // --- Pagination (table only — KPIs and CSV always use the full visible set) ---
  readonly pageSizeOptions = [10, 20, 50, 100] as const;
  readonly pageSize = signal<number>(20);
  readonly page = signal<number>(1);

  // Dropdown UI state for the user picker
  readonly userPickerOpen = signal(false);
  readonly userPickerFilter = signal('');
  /** Viewport-anchored position of the popover; recomputed each open from the trigger button. */
  readonly userPickerPos = signal<{ top: number; left: number } | null>(null);

  /** Trigger button ref — used to anchor the popover (which is rendered at the page root
   *  to escape the filter-bar's `backdrop-filter` stacking context). */
  private readonly pickerTriggerRef = viewChild<ElementRef<HTMLButtonElement>>('pickerTrigger');

  // --- data ---
  readonly report = signal<YearlyReport | null>(null);
  readonly loading = signal(false);
  readonly toast = signal<{ message: string; kind: 'success' | 'error' } | null>(null);
  readonly editorOpen = signal(false);

  // --- expand state ---
  readonly expandedRows = signal<Set<string>>(new Set());

  readonly canEditWorkingDays = computed(() =>
    this.auth.hasRole('ADMIN', 'MANAGER', 'TECH_LEAD', 'QA_SPECIALIST'),
  );

  readonly yearTargetTotal = computed(() => {
    const r = this.report();
    return r ? parseFloat(r.yearTargetHours) : 0;
  });

  /** Rows shown in the matrix — filtered by the user multi-select if any are picked.
   *  KPIs / CSV / column totals all read this so they reflect the full filtered set,
   *  not just the current page. */
  readonly visibleRows = computed(() => {
    const all = this.report()?.rows ?? [];
    const sel = this.selectedAccountIds();
    if (sel.size === 0) return all;
    return all.filter((r) => sel.has(r.user.accountId));
  });

  /** Pagination: how many pages the visible rows span. */
  readonly totalPages = computed(() => {
    const total = this.visibleRows().length;
    return Math.max(1, Math.ceil(total / this.pageSize()));
  });

  /** Slice of visibleRows for the current page — what the matrix tbody actually renders. */
  readonly pagedRows = computed(() => {
    const rows = this.visibleRows();
    const ps = this.pageSize();
    const p = Math.min(this.page(), Math.max(1, Math.ceil(rows.length / ps)));
    const start = (p - 1) * ps;
    return rows.slice(start, start + ps);
  });

  readonly userCount = computed(() => this.visibleRows().length);

  readonly grandTotal = computed(() =>
    this.visibleRows().reduce((s, r) => s + parseFloat(r.yearTotal), 0),
  );

  readonly avgPerUser = computed(() => {
    const n = this.userCount();
    return n > 0 ? this.grandTotal() / n : 0;
  });

  readonly fillRatePct = computed(() => {
    const target = this.yearTargetTotal();
    const n = this.userCount();
    if (target === 0 || n === 0) return 0;
    return Math.round((this.grandTotal() / (target * n)) * 100);
  });

  readonly columnTotals = computed(() => {
    const rows = this.visibleRows();
    const totals = new Array(12).fill(0);
    for (const row of rows) {
      row.hoursByMonth.forEach((h, i) => { totals[i] += parseFloat(h) || 0; });
    }
    return totals;
  });

  readonly expectedDays = computed(() => this.report()?.expectedWorkingDays ?? new Array(12).fill(22));

  /** Sorted directory used to populate the user picker. */
  readonly directoryUsers = computed(() => {
    // The directory is a Map<accountId, entry>; we surface it as a sorted array.
    // Reading the signal keeps this computed reactive when the directory loads.
    const map = this.usersDir.directory();
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

  readonly selectedCount = computed(() => this.selectedAccountIds().size);

  constructor() {
    effect(() => {
      // The user multi-select is applied client-side, so it isn't part of the server filters.
      const filters = {
        year: this.year(),
        teamId: this.teamFilter(),
        projectId: this.projectFilter(),
        includeBreakdown: this.includeBreakdown(),
      };
      this.fetchReport(filters);
    });

    // Reset to page 1 whenever the underlying data set changes (filters or page size).
    effect(() => {
      // Track the inputs that affect total page count.
      this.year();
      this.teamFilter();
      this.projectFilter();
      this.selectedAccountIds();
      this.pageSize();
      this.page.set(1);
    });
  }

  private fetchReport(filters: any): void {
    this.loading.set(true);
    this.reportApi.yearlyReport(filters).subscribe({
      next: (res) => {
        this.report.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.report.set(null);
        this.loading.set(false);
      },
    });
  }

  refetch(): void {
    this.fetchReport({
      year: this.year(),
      teamId: this.teamFilter(),
      projectId: this.projectFilter(),
      includeBreakdown: this.includeBreakdown(),
    });
  }

  toggleRow(accountId: string): void {
    this.expandedRows.update((s) => {
      const next = new Set(s);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  }
  isExpanded(accountId: string): boolean {
    return this.expandedRows().has(accountId);
  }

  toggleAllRows(): void {
    const rows = this.visibleRows();
    if (this.expandedRows().size === rows.length) {
      this.expandedRows.set(new Set());
    } else {
      this.expandedRows.set(new Set(rows.map((r) => r.user.accountId)));
    }
  }

  allExpanded(): boolean {
    const rows = this.visibleRows();
    return rows.length > 0 && this.expandedRows().size === rows.length;
  }

  // --- Pagination ---
  setPage(p: number): void {
    this.page.set(Math.max(1, Math.min(p, this.totalPages())));
  }
  setPageSize(size: number): void {
    this.pageSize.set(size);
    // page is auto-reset by the effect tracking pageSize().
  }
  /** Sliding window of up to 5 page numbers around the current page (for the pager UI). */
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

  // --- User multi-select picker ---
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
    // Right-align the popover with the trigger; clamp to the viewport so it stays visible.
    const left = Math.max(8, Math.min(window.innerWidth - popoverWidth - 8, rect.right - popoverWidth));
    this.userPickerPos.set({ top: rect.bottom + 6, left });
  }

  /** Reposition the popover when the layout shifts. */
  @HostListener('window:scroll')
  @HostListener('window:resize')
  onWindowChange(): void {
    if (!this.userPickerOpen()) return;
    this.recomputePickerPosition();
  }
  toggleUserSelection(accountId: string): void {
    this.selectedAccountIds.update((s) => {
      const next = new Set(s);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  }
  isUserSelected(accountId: string): boolean {
    return this.selectedAccountIds().has(accountId);
  }
  clearUserSelection(): void {
    this.selectedAccountIds.set(new Set());
  }
  userPickerLabel(): string {
    const n = this.selectedCount();
    if (n === 0) return this.localeSvc.t('yearly_report.users_all');
    if (n === 1) return this.localeSvc.t('yearly_report.users_selected_one');
    return this.localeSvc.t('yearly_report.users_selected_many', { count: n });
  }

  // --- coloring helpers used by the template ---

  toneFor(hours: number, monthIdx: number) {
    return getCellTone(hours, this.expectedDays()[monthIdx]);
  }
  yearTone(yearTotal: number) {
    const expectedSum = this.expectedDays().reduce((s, d) => s + d, 0);
    return getCellTone(yearTotal, expectedSum);
  }
  toneStyle(tone: ReturnType<typeof getCellTone>) {
    return TONE_STYLES[tone];
  }

  monthTargetHours(monthIdx: number): number {
    return this.expectedDays()[monthIdx] * 8;
  }

  /** Fill percentage of a month cell relative to that month's target hours. */
  monthPct(hours: number, monthIdx: number): number {
    const target = this.monthTargetHours(monthIdx);
    return target > 0 ? Math.round((hours / target) * 100) : 0;
  }

  /** Fill percentage of the year total relative to the full-year target hours. */
  yearPct(yearTotal: number): number {
    const target = this.yearTargetTotal();
    return target > 0 ? Math.round((yearTotal / target) * 100) : 0;
  }

  parseFloat(s: string): number {
    return parseFloat(s) || 0;
  }

  /** Whether an activity breakdown row should be shown.
   *  When a project filter is active only Project entries carry hours
   *  (Non-Project / Self-Imp have NULL project_id), so we hide the empty rows. */
  showBreakdownRow(months: string[]): boolean {
    if (this.projectFilter() === null) return true;
    return months.reduce((acc, h) => acc + (parseFloat(h) || 0), 0) > 0;
  }

  activityColor(activityId: string): string {
    const map: Record<string, string> = {
      '1': 'var(--c-teal)',
      '2': 'var(--c-amber)',
      '3': 'var(--c-purple)',
    };
    return map[activityId] ?? 'var(--c-blue)';
  }

  activityName(activityId: string): string {
    const found = this.lookups.activityTypes().find((a) => String(a.id) === activityId);
    return found?.name ?? `Activity ${activityId}`;
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((p) => p[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  // --- Working-days editor ---
  openEditor(): void {
    this.editorOpen.set(true);
  }
  closeEditor(): void {
    this.editorOpen.set(false);
  }
  saveWorkingDays(months: number[]): void {
    this.editorOpen.set(false);
    this.reportApi.saveWorkingDays(this.year(), months).subscribe({
      next: () => {
        this.flashToast(this.localeSvc.t('yearly_report.saved_msg', { year: this.year() }), 'success');
        this.refetch();
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : this.localeSvc.t('common.failed_save'), 'error');
      },
    });
  }

  // --- CSV export (client-side) ---
  exportCsv(): void {
    const r = this.report();
    const rows = this.visibleRows();
    if (!r || rows.length === 0) return;

    const target = this.yearTargetTotal();
    const headerRow1 = ['Yearly Report', String(r.year)];
    const headerRow3 = [
      'Kullanıcı', 'Account ID', 'Takım',
      ...TR_MONTHS_FULL,
      'Yıllık Toplam', 'Hedef (saat)', 'Doluluk %',
    ];
    const expectedRow = [
      '', '', 'Working days →',
      ...r.expectedWorkingDays.map((d) => `${d} gün`),
      `${r.expectedWorkingDays.reduce((s, d) => s + d, 0)} gün`,
      `${target}h`,
      '',
    ];
    const dataRows: (string | number)[][] = [];
    rows.forEach((row) => {
      const total = parseFloat(row.yearTotal);
      const pct = target > 0 ? Math.round((total / target) * 100) : 0;
      dataRows.push([
        row.user.name,
        row.user.accountId,
        row.user.team ?? '',
        ...row.hoursByMonth.map((h) => parseFloat(h).toFixed(1)),
        total.toFixed(1),
        target,
        `${pct}%`,
      ]);
      // Activity breakdown rows
      Object.entries(row.breakdownByActivity).forEach(([actId, months]) => {
        const aTotal = months.reduce((s, h) => s + parseFloat(h), 0);
        if (aTotal === 0) return;
        dataRows.push([
          `   └─ ${this.activityName(actId)}`,
          '', '',
          ...months.map((h) => (parseFloat(h) > 0 ? parseFloat(h).toFixed(1) : '')),
          aTotal.toFixed(1),
          '',
          '',
        ]);
      });
    });
    const footerRow: (string | number)[] = [
      'Şirket toplamı', '', '',
      ...this.columnTotals().map((h) => h.toFixed(1)),
      this.grandTotal().toFixed(1),
      target * this.userCount(),
      target > 0 && this.userCount() > 0
        ? `${Math.round((this.grandTotal() / (target * this.userCount())) * 100)}%`
        : '0%',
    ];

    const all = [headerRow1, [], headerRow3, expectedRow, ...dataRows, [], footerRow];
    const csv = all
      .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yearly-report-${r.year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.flashToast(
      this.localeSvc.t('yearly_report.export_done', { count: rows.length }),
      'success',
    );
  }

  private flashToast(message: string, kind: 'success' | 'error'): void {
    this.toast.set({ message, kind });
    setTimeout(() => this.toast.set(null), 2500);
  }

  // Template-friendly reducers (arrows aren't allowed inline in templates).
  readonly sumReducer = (acc: number, v: number) => acc + v;
  readonly sumStringReducer = (acc: number, v: string) => acc + (parseFloat(v) || 0);
}
