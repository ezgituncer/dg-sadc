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
  Edit2,
  Plus,
  X,
  AlertCircle,
} from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { LookupService } from '../../core/services/lookup.service';
import { ReportService } from '../../core/services/report.service';
import { TeamsService } from '../../core/services/users.service';
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './yearly-report.component.html',
  styleUrl: './yearly-report.component.css',
})
export class YearlyReportComponent {
  private readonly auth = inject(AuthService);
  protected readonly lookups = inject(LookupService);
  protected readonly teams = inject(TeamsService);
  private readonly reportApi = inject(ReportService);

  readonly icons = { Calendar, Search, Save, Edit2, Plus, X, AlertCircle };
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
  readonly search = signal('');
  readonly includeBreakdown = signal(true);

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

  readonly grandTotal = computed(() => {
    const r = this.report();
    return r ? parseFloat(r.grandTotal) : 0;
  });

  readonly userCount = computed(() => this.report()?.rows.length ?? 0);

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
    const r = this.report();
    return r ? r.columnTotals.map((s) => parseFloat(s)) : new Array(12).fill(0);
  });

  readonly expectedDays = computed(() => this.report()?.expectedWorkingDays ?? new Array(12).fill(22));

  constructor() {
    effect(() => {
      const filters = {
        year: this.year(),
        teamId: this.teamFilter(),
        projectId: this.projectFilter(),
        search: this.search().trim() || undefined,
        includeBreakdown: this.includeBreakdown(),
      };
      this.fetchReport(filters);
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
      search: this.search().trim() || undefined,
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
    const rows = this.report()?.rows ?? [];
    if (this.expandedRows().size === rows.length) {
      this.expandedRows.set(new Set());
    } else {
      this.expandedRows.set(new Set(rows.map((r) => r.user.accountId)));
    }
  }

  allExpanded(): boolean {
    const rows = this.report()?.rows ?? [];
    return rows.length > 0 && this.expandedRows().size === rows.length;
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

  parseFloat(s: string): number {
    return parseFloat(s) || 0;
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
        this.flashToast(`${this.year()} working days güncellendi`, 'success');
        this.refetch();
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : 'Güncellenemedi', 'error');
      },
    });
  }

  // --- CSV export (client-side) ---
  exportCsv(): void {
    const r = this.report();
    if (!r || r.rows.length === 0) return;

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
    r.rows.forEach((row) => {
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
    this.flashToast(`${r.rows.length} kullanıcı için rapor indirildi`, 'success');
  }

  private flashToast(message: string, kind: 'success' | 'error'): void {
    this.toast.set({ message, kind });
    setTimeout(() => this.toast.set(null), 2500);
  }

  // Template-friendly reducers (arrows aren't allowed inline in templates).
  readonly sumReducer = (acc: number, v: number) => acc + v;
  readonly sumStringReducer = (acc: number, v: string) => acc + (parseFloat(v) || 0);
}
