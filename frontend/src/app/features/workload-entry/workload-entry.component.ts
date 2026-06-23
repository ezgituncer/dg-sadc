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
import { ActivatedRoute } from '@angular/router';
import {
  LucideAngularModule,
  Calendar,
  AlertCircle,
  Edit2,
  Activity,
  Tag,
  FolderOpen,
  Layers,
  Clock,
  FileText,
  Hash,
  Plus,
  Save,
  Trash2,
} from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { LocaleService } from '../../core/services/locale.service';
import { LookupService } from '../../core/services/lookup.service';
import { WorkloadService } from '../../core/services/workload.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import {
  Complexity,
  WorkStatus,
  WorkloadEntry,
} from '../../core/models/workload';
import { ToastComponent } from '../../shared/components/toast.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { isoToday, isWithinEditWindow } from '../../shared/utils/date.utils';

interface FormState {
  activityTypeId: number | null;
  categoryId: number | null;
  projectId: number | null;
  taskTypeId: number | null;
  taskDescription: string;
  status: WorkStatus;
  complexity: Complexity;
  quantity: string;
  hoursSpent: string;
}

// Default activity is PROJECT (stable id=1) — most common case for daily logs.
const DEFAULT_ACTIVITY_TYPE_ID = 1;

const EMPTY_FORM: FormState = {
  activityTypeId: DEFAULT_ACTIVITY_TYPE_ID,
  categoryId: null,
  projectId: null,
  taskTypeId: null,
  taskDescription: '',
  status: 'ongoing',
  complexity: 'medium',
  quantity: '',
  hoursSpent: '',
};

@Component({
  selector: 'app-workload-entry',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ToastComponent,
    ConfirmDialogComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workload-entry.component.html',
  styleUrl: './workload-entry.component.css',
})
export class WorkloadEntryComponent {
  private readonly auth = inject(AuthService);
  private readonly lookups = inject(LookupService);
  private readonly api = inject(WorkloadService);
  private readonly localeSvc = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);

  readonly icons = {
    Calendar, AlertCircle, Edit2, Activity, Tag, FolderOpen, Layers,
    Clock, FileText, Hash, Plus, Save, Trash2,
  };

  readonly today = isoToday();
  readonly date = signal<string>(this.today);

  readonly form = signal<FormState>({ ...EMPTY_FORM });
  readonly editingId = signal<number | null>(null);
  readonly toast = signal<{ message: string; kind: 'success' | 'error' } | null>(null);
  readonly confirmDeleteId = signal<number | null>(null);
  readonly submitting = signal(false);

  readonly entries = signal<WorkloadEntry[]>([]);
  readonly loading = signal(false);

  readonly currentUser = this.auth.currentUser;

  readonly dateLocked = computed(() => !isWithinEditWindow(this.date()));
  readonly isProjectActivity = computed(() => this.form().activityTypeId === 1);

  readonly activityOptions = computed(() =>
    this.lookups.activeActivityTypes().map((a) => ({
      value: a.id,
      label: a.name,
      color: ({ 1: 'var(--c-teal)', 2: 'var(--c-amber)', 3: 'var(--c-purple)' } as Record<number, string>)[a.id]
        ?? 'var(--c-blue)',
    })),
  );
  readonly categoryOptions = computed(() =>
    this.lookups.getCategoriesForActivity(this.form().activityTypeId),
  );
  readonly projectOptions = computed(() => this.lookups.activeProjects());
  readonly taskTypeOptions = computed(() => this.lookups.activeTaskTypes());

  readonly statusOptions = computed<{ value: WorkStatus; label: string; color: string }[]>(() => {
    // touch the locale signal so the labels recompute when the user toggles language
    this.localeSvc.locale();
    return [
      { value: 'ongoing',   label: this.localeSvc.t('workload_entry.status_ongoing'),   color: 'var(--c-blue)' },
      { value: 'completed', label: this.localeSvc.t('workload_entry.status_completed'), color: 'var(--c-green)' },
      { value: 'blocked',   label: this.localeSvc.t('workload_entry.status_blocked'),   color: 'var(--c-red)' },
    ];
  });
  readonly complexityOptions = computed<{ value: Complexity; label: string }[]>(() => {
    this.localeSvc.locale();
    return [
      { value: 'low',    label: this.localeSvc.t('workload_entry.complexity_low') },
      { value: 'medium', label: this.localeSvc.t('workload_entry.complexity_medium') },
      { value: 'high',   label: this.localeSvc.t('workload_entry.complexity_high') },
    ];
  });

  readonly dayEntries = computed(() => {
    const me = this.currentUser()?.accountId;
    return this.entries()
      .filter((e) => e.accountId === me && e.workDate === this.date())
      .sort((a, b) => b.id - a.id);
  });
  readonly dayTotalHours = computed(() =>
    this.dayEntries().reduce((s, e) => s + parseFloat(e.hoursSpent || '0'), 0),
  );

  readonly isFormValid = computed(() => {
    const f = this.form();
    if (!f.activityTypeId || !f.categoryId) return false;
    if (f.activityTypeId === 1 && !f.projectId) return false;
    if (!f.taskDescription.trim()) return false;
    const h = parseFloat(f.hoursSpent);
    if (!isFinite(h) || h <= 0) return false;
    return true;
  });

  /** Entry id to auto-open for editing once the day's entries load (from ?edit=). */
  private pendingEditId: number | null = null;

  constructor() {
    // Pre-select a day when navigated here with ?date=YYYY-MM-DD (e.g. from My Workload
    // or the listing's "edit" action), and optionally open an entry via ?edit=<id>.
    const qpDate = this.route.snapshot.queryParamMap.get('date');
    if (qpDate && /^\d{4}-\d{2}-\d{2}$/.test(qpDate)) {
      this.date.set(qpDate);
    }
    const qpEdit = this.route.snapshot.queryParamMap.get('edit');
    if (qpEdit && /^\d+$/.test(qpEdit)) {
      this.pendingEditId = parseInt(qpEdit, 10);
    }

    // Refetch the day's entries whenever the date changes (or after a successful submit).
    effect(() => {
      const date = this.date();
      const me = this.currentUser()?.accountId;
      if (!me) return;
      this.loadDayEntries(me, date);
    });
  }


  setDate(value: string): void {
    this.date.set(value);
    this.resetForm();
  }

  goToday(): void {
    this.setDate(this.today);
  }

  resetForm(): void {
    this.form.set({ ...EMPTY_FORM });
    this.editingId.set(null);
  }

  onActivityTypeChange(activityTypeId: number): void {
    // Reset category and project when activity changes — the category list differs per activity.
    this.form.update((f) => ({ ...f, activityTypeId, categoryId: null, projectId: null }));
  }

  patch<K extends keyof FormState>(key: K, value: FormState[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  submit(): void {
    if (!this.isFormValid() || this.dateLocked() || this.submitting()) return;

    const f = this.form();
    const payload = {
      workDate: this.date(),
      activityTypeId: f.activityTypeId!,
      categoryId: f.categoryId!,
      projectId: this.isProjectActivity() ? f.projectId : null,
      taskTypeId: f.taskTypeId,
      taskDescription: f.taskDescription.trim(),
      status: f.status,
      complexity: f.complexity,
      quantity: f.quantity === '' ? null : parseInt(f.quantity, 10),
      hoursSpent: parseFloat(f.hoursSpent).toFixed(2),
    };

    this.submitting.set(true);
    const editId = this.editingId();
    const op$ = editId
      ? this.api.update(editId, payload)
      : this.api.create(payload);

    op$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.showToast(
          this.localeSvc.t(editId ? 'common.saved' : 'workload_entry.toast_added'),
          'success',
        );
        this.resetForm();
        const me = this.currentUser()?.accountId;
        if (me) this.loadDayEntries(me, this.date());
      },
      error: (err) => {
        this.submitting.set(false);
        const detail = err?.error?.detail;
        this.showToast(typeof detail === 'string' ? detail : this.localeSvc.t('common.failed_save'), 'error');
      },
    });
  }

  edit(entry: WorkloadEntry): void {
    this.editingId.set(entry.id);
    this.form.set({
      activityTypeId: entry.activityTypeId,
      categoryId: entry.categoryId,
      projectId: entry.projectId,
      taskTypeId: entry.taskTypeId,
      taskDescription: entry.taskDescription,
      status: entry.status,
      complexity: entry.complexity,
      quantity: entry.quantity == null ? '' : String(entry.quantity),
      hoursSpent: parseFloat(entry.hoursSpent).toString(),
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
        this.showToast(this.localeSvc.t('common.deleted'), 'success');
        if (this.editingId() === id) this.resetForm();
        const me = this.currentUser()?.accountId;
        if (me) this.loadDayEntries(me, this.date());
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.showToast(typeof detail === 'string' ? detail : this.localeSvc.t('common.failed_delete'), 'error');
      },
    });
  }

  private loadDayEntries(accountId: string, day: string): void {
    this.loading.set(true);
    this.api
      .list({ accountId: [accountId], dateFrom: day, dateTo: day, pageSize: 100 })
      .subscribe({
        next: (res) => {
          this.entries.set(res.items);
          this.loading.set(false);
          // If we arrived via ?edit=<id>, open that entry in the form (own + within window).
          if (this.pendingEditId !== null) {
            const match = res.items.find((e) => e.id === this.pendingEditId);
            this.pendingEditId = null;
            if (match && this.canEditEntry(match)) this.edit(match);
          }
        },
        error: () => {
          this.entries.set([]);
          this.loading.set(false);
        },
      });
  }

  private showToast(message: string, kind: 'success' | 'error'): void {
    this.toast.set({ message, kind });
    setTimeout(() => this.toast.set(null), 2500);
  }

  // Helpers used by the template
  categoryFor(entry: WorkloadEntry) {
    return this.lookups.findCategory(entry.activityTypeId, entry.categoryId);
  }
  projectFor(entry: WorkloadEntry) {
    return this.lookups.findProject(entry.projectId);
  }
  activityFor(entry: WorkloadEntry) {
    return this.lookups.findActivityType(entry.activityTypeId);
  }
  taskTypeFor(entry: WorkloadEntry) {
    return this.lookups.findTaskType(entry.taskTypeId);
  }
  isOwn(entry: WorkloadEntry) {
    return entry.accountId === this.currentUser()?.accountId;
  }
  canEditEntry(entry: WorkloadEntry) {
    return this.isOwn(entry) && isWithinEditWindow(entry.workDate);
  }
  toNumber(s: string): number {
    return parseFloat(s) || 0;
  }
}
