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
  Plus,
  Edit2,
  Trash2,
  Power,
  Search,
  X,
  Save,
} from 'lucide-angular';

import {
  LookupCrudService,
  LookupCreatePayload,
  LookupKind,
  LookupListItem,
  LookupUpdatePayload,
} from '../../core/services/lookup-crud.service';
import { LocaleService } from '../../core/services/locale.service';
import { LookupService } from '../../core/services/lookup.service';
import { ToastComponent } from '../../shared/components/toast.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

interface Tab {
  kind: LookupKind;
  /** i18n key under `lookups.*` */
  labelKey: string;
  hasColor: boolean;
  hasDescription: boolean;
}

const TABS: Tab[] = [
  { kind: 'projects',                labelKey: 'lookups.tab_projects',                 hasColor: false, hasDescription: true },
  { kind: 'activity-types',          labelKey: 'lookups.tab_activity_types',           hasColor: false, hasDescription: true },
  { kind: 'project-categories',      labelKey: 'lookups.tab_project_categories',       hasColor: true,  hasDescription: false },
  { kind: 'non-project-categories',  labelKey: 'lookups.tab_non_project_categories',   hasColor: true,  hasDescription: false },
  { kind: 'self-imp-categories',     labelKey: 'lookups.tab_self_imp_categories',      hasColor: true,  hasDescription: false },
  { kind: 'task-types',              labelKey: 'lookups.tab_task_types',               hasColor: false, hasDescription: false },
];

const COLOR_PALETTE = [
  '#2DD4BF', '#3B82F6', '#A78BFA', '#F59E0B', '#EC4899',
  '#10B981', '#EF4444', '#06B6D4', '#8B5CF6', '#F97316',
];

interface ModalState {
  mode: 'create' | 'edit';
  code: string;
  name: string;
  description: string;
  color: string;
  itemId?: number;
  isActive?: boolean;
}

@Component({
  selector: 'app-lookups',
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
  templateUrl: './lookups.component.html',
  styleUrl: './lookups.component.css',
})
export class LookupsComponent {
  private readonly api = inject(LookupCrudService);
  private readonly lookups = inject(LookupService);
  private readonly localeSvc = inject(LocaleService);

  readonly icons = { Plus, Edit2, Trash2, Power, Search, X, Save };
  readonly tabs = TABS;
  readonly colorPalette = COLOR_PALETTE;

  readonly activeTab = signal<Tab>(TABS[0]);
  readonly search = signal('');
  readonly includeInactive = signal(false);

  readonly items = signal<LookupListItem[]>([]);
  readonly loading = signal(false);

  readonly toast = signal<{ message: string; kind: 'success' | 'error' } | null>(null);
  readonly confirmDelete = signal<{ id: number; name: string } | null>(null);
  readonly modal = signal<ModalState | null>(null);
  readonly saving = signal(false);
  readonly codeError = signal<string | null>(null);

  readonly filteredItems = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.items();
    return this.items().filter(
      (it) => it.code.toLowerCase().includes(q) || it.name.toLowerCase().includes(q),
    );
  });

  constructor() {
    effect(() => {
      const tab = this.activeTab();
      const includeInactive = this.includeInactive();
      this.fetch(tab.kind, includeInactive);
    });
  }

  selectTab(t: Tab): void {
    this.activeTab.set(t);
    this.search.set('');
  }

  private fetch(kind: LookupKind, includeInactive: boolean): void {
    this.loading.set(true);
    this.api.list(kind, includeInactive).subscribe({
      next: (res) => {
        this.items.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
      },
    });
  }

  refetch(): void {
    this.fetch(this.activeTab().kind, this.includeInactive());
    // Refresh global lookup cache so other pages see the change.
    this.lookups.loadAll().catch(() => {});
  }

  startCreate(): void {
    this.codeError.set(null);
    this.modal.set({
      mode: 'create',
      code: '',
      name: '',
      description: '',
      color: this.colorPalette[0],
    });
  }

  startEdit(item: LookupListItem): void {
    this.codeError.set(null);
    this.modal.set({
      mode: 'edit',
      code: item.code,
      name: item.name,
      description: item.description ?? '',
      color: item.color ?? this.colorPalette[0],
      itemId: item.id,
      isActive: item.isActive,
    });
  }

  closeModal(): void {
    this.modal.set(null);
    this.codeError.set(null);
  }

  patchModal<K extends keyof ModalState>(key: K, value: ModalState[K]): void {
    this.modal.update((m) => (m ? { ...m, [key]: value } : m));
  }

  saveModal(): void {
    const m = this.modal();
    if (!m || this.saving()) return;
    if (m.mode === 'create' && !/^[A-Z0-9_-]+$/.test(m.code)) {
      this.codeError.set(this.localeSvc.t('lookups.code_regex_msg'));
      return;
    }
    if (!m.name.trim()) {
      this.flashToast(this.localeSvc.t('lookups.name_required_msg'), 'error');
      return;
    }
    this.saving.set(true);

    if (m.mode === 'create') {
      const payload: LookupCreatePayload = {
        code: m.code,
        name: m.name.trim(),
      };
      if (this.activeTab().hasDescription) payload.description = m.description.trim() || undefined;
      if (this.activeTab().hasColor) payload.color = m.color;
      this.api.create(this.activeTab().kind, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.flashToast(this.localeSvc.t('lookups.toast_added'), 'success');
          this.refetch();
        },
        error: (err) => this.handleSaveError(err),
      });
    } else {
      const payload: LookupUpdatePayload = { name: m.name.trim() };
      if (this.activeTab().hasDescription) payload.description = m.description.trim();
      if (this.activeTab().hasColor) payload.color = m.color;
      this.api.update(this.activeTab().kind, m.itemId!, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.flashToast(this.localeSvc.t('lookups.toast_updated'), 'success');
          this.refetch();
        },
        error: (err) => this.handleSaveError(err),
      });
    }
  }

  private handleSaveError(err: any): void {
    this.saving.set(false);
    const detail = err?.error?.detail;
    this.flashToast(typeof detail === 'string' ? detail : this.localeSvc.t('lookups.toast_failed'), 'error');
  }

  askDelete(item: LookupListItem): void {
    this.confirmDelete.set({ id: item.id, name: item.name });
  }
  cancelDelete(): void {
    this.confirmDelete.set(null);
  }
  confirmSoftDelete(): void {
    const target = this.confirmDelete();
    this.confirmDelete.set(null);
    if (!target) return;
    this.api.softDelete(this.activeTab().kind, target.id).subscribe({
      next: () => {
        this.flashToast(this.localeSvc.t('lookups.toast_deactivated'), 'success');
        this.refetch();
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : this.localeSvc.t('common.failed_delete'), 'error');
      },
    });
  }

  reactivate(item: LookupListItem): void {
    this.api.activate(this.activeTab().kind, item.id).subscribe({
      next: () => {
        this.flashToast(this.localeSvc.t('lookups.toast_reactivated'), 'success');
        this.refetch();
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : this.localeSvc.t('common.failed_save'), 'error');
      },
    });
  }

  private flashToast(message: string, kind: 'success' | 'error'): void {
    this.toast.set({ message, kind });
    setTimeout(() => this.toast.set(null), 2500);
  }
}
