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
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
} from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { LookupService } from '../../core/services/lookup.service';
import { ReportService } from '../../core/services/report.service';
import { WorkloadService } from '../../core/services/workload.service';
import { WorkloadEntry } from '../../core/models/workload';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TR_MONTHS_FULL } from '../../shared/utils/cell-tone';
import { formatIso, isoToday, isWithinEditWindow } from '../../shared/utils/date.utils';

const HOURS_PER_DAY = 8;

/** A single calendar cell. `date` is null for padding cells outside the month.
 *  tone: green = 8h+, yellow = under 8h, red = nothing logged (past working day),
 *  weekend / future = neutral, pad = outside the month. */
interface DayCell {
  date: string | null;
  day: number;
  hours: number;
  tone: 'green' | 'yellow' | 'red' | 'weekend' | 'future' | 'pad';
  isToday: boolean;
  /** Whether a workload entry can be logged for this day (within the edit window, not future). */
  addable: boolean;
}

@Component({
  selector: 'app-my-workload',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-workload.component.html',
  styleUrl: './my-workload.component.css',
})
export class MyWorkloadComponent {
  private readonly auth = inject(AuthService);
  protected readonly lookups = inject(LookupService);
  private readonly reportApi = inject(ReportService);
  private readonly api = inject(WorkloadService);
  private readonly router = inject(Router);

  readonly icons = { Calendar, CalendarDays, ChevronLeft, ChevronRight, Clock, AlertCircle, CheckCircle2, Plus };

  readonly trMonths = TR_MONTHS_FULL;
  // Monday-first weekday labels for the calendar header.
  readonly weekdayLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  private readonly today = isoToday();

  readonly currentYear = new Date().getFullYear();
  readonly currentMonth = new Date().getMonth(); // 0-11

  readonly availableYears = (() => {
    const years: number[] = [];
    for (let y = this.currentYear - 2; y <= this.currentYear + 1; y++) years.push(y);
    return years.reverse();
  })();
  readonly monthOptions = this.trMonths.map((name, idx) => ({ idx, name }));

  // --- filters ---
  readonly year = signal(this.currentYear);
  readonly month = signal(this.currentMonth); // 0-11

  // --- data ---
  readonly entries = signal<WorkloadEntry[]>([]);
  readonly expectedByMonth = signal<number[]>(new Array(12).fill(22));
  readonly loading = signal(false);

  readonly selectedDate = signal<string | null>(null);

  readonly accountId = computed(() => this.auth.currentUser()?.accountId ?? '');

  constructor() {
    // Working days are per-year; fetch when the year changes.
    effect(() => {
      const y = this.year();
      this.reportApi.getWorkingDays(y).subscribe({
        next: (res) => this.expectedByMonth.set(res.months),
        error: () => this.expectedByMonth.set(new Array(12).fill(22)),
      });
    });

    // Entries for the selected month + current user.
    effect(() => {
      const y = this.year();
      const m = this.month();
      const acc = this.accountId();
      if (!acc) return;
      const from = formatIso(new Date(y, m, 1));
      const to = formatIso(new Date(y, m + 1, 0));
      this.loading.set(true);
      this.selectedDate.set(null);
      this.api
        .list({
          accountId: [acc],
          dateFrom: from,
          dateTo: to,
          sort: 'work_date',
          direction: 'asc',
          page: 1,
          pageSize: 1000,
        })
        .subscribe({
          next: (res) => {
            this.entries.set(res.items);
            this.loading.set(false);
          },
          error: () => {
            this.entries.set([]);
            this.loading.set(false);
          },
        });
    });
  }

  // --- derived ---
  readonly expectedDays = computed(() => this.expectedByMonth()[this.month()] ?? 0);
  readonly expectedHours = computed(() => this.expectedDays() * HOURS_PER_DAY);

  /** date (iso) → total hours that day. */
  readonly hoursByDay = computed(() => {
    const map = new Map<string, number>();
    for (const e of this.entries()) {
      map.set(e.workDate, (map.get(e.workDate) ?? 0) + (parseFloat(e.hoursSpent) || 0));
    }
    return map;
  });

  readonly enteredHours = computed(() =>
    this.entries().reduce((s, e) => s + (parseFloat(e.hoursSpent) || 0), 0),
  );

  readonly enteredDays = computed(() => {
    let n = 0;
    for (const h of this.hoursByDay().values()) if (h > 0) n++;
    return n;
  });

  readonly fillPct = computed(() => {
    const target = this.expectedHours();
    if (target === 0) return 0;
    return Math.round((this.enteredHours() / target) * 100);
  });

  /** Calendar grid: weeks of 7 day-cells, Monday-first. */
  readonly weeks = computed<DayCell[][]>(() => {
    const y = this.year();
    const m = this.month();
    const hoursByDay = this.hoursByDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    // Monday-first offset of the 1st of the month.
    const firstJsDay = new Date(y, m, 1).getDay(); // 0=Sun..6=Sat
    const leadPad = (firstJsDay + 6) % 7;

    const cells: DayCell[] = [];
    for (let i = 0; i < leadPad; i++) {
      cells.push({ date: null, day: 0, hours: 0, tone: 'pad', isToday: false, addable: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(y, m, day);
      const iso = formatIso(d);
      const jsDay = d.getDay();
      const isWeekend = jsDay === 0 || jsDay === 6;
      const hours = hoursByDay.get(iso) ?? 0;

      let tone: DayCell['tone'];
      if (hours >= HOURS_PER_DAY) tone = 'green';
      else if (hours > 0) tone = 'yellow';
      else if (isWeekend) tone = 'weekend';
      else if (iso > this.today) tone = 'future';
      else tone = 'red'; // past (or current) working day with nothing logged

      cells.push({
        date: iso,
        day,
        hours,
        tone,
        isToday: iso === this.today,
        addable: isWithinEditWindow(iso),
      });
    }
    // Trailing padding to complete the last week.
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, day: 0, hours: 0, tone: 'pad', isToday: false, addable: false });
    }

    const weeks: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  });

  /** Count of past weekdays in the month with no entry. */
  readonly missingDays = computed(() => {
    let n = 0;
    for (const week of this.weeks()) {
      for (const cell of week) {
        if (cell.tone === 'red') n++;
      }
    }
    return n;
  });

  /** Entries for the currently selected day (detail panel). */
  readonly selectedEntries = computed(() => {
    const date = this.selectedDate();
    if (!date) return [];
    return this.entries().filter((e) => e.workDate === date);
  });

  // --- interactions ---
  prevMonth(): void {
    const m = this.month();
    if (m === 0) {
      this.month.set(11);
      this.year.update((y) => y - 1);
    } else {
      this.month.set(m - 1);
    }
  }
  nextMonth(): void {
    const m = this.month();
    if (m === 11) {
      this.month.set(0);
      this.year.update((y) => y + 1);
    } else {
      this.month.set(m + 1);
    }
  }

  selectDay(cell: DayCell): void {
    if (!cell.date || cell.hours === 0) return;
    this.selectedDate.set(this.selectedDate() === cell.date ? null : cell.date);
  }

  /** Jump to the entry form with this day pre-selected. */
  addEntry(cell: DayCell, event: Event): void {
    event.stopPropagation();
    if (!cell.date) return;
    this.router.navigate(['/workload-entry'], { queryParams: { date: cell.date } });
  }

  // --- lookup helpers for the detail panel ---
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
}
