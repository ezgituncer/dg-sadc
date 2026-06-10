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
  UserPlus,
  Search,
  Save,
  Trash2,
  KeyRound,
  Power,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { LocaleService } from '../../core/services/locale.service';
import {
  PositionsService,
  RolesService,
  TeamsService,
  UsersService,
  UserFilters,
} from '../../core/services/users.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import {
  UserCreatePayload,
  UserListItem,
  UserUpdatePayload,
} from '../../core/models/admin';
import { ToastComponent } from '../../shared/components/toast.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { PasswordResetDialogComponent } from './password-reset-dialog.component';

interface FormState {
  accountId: string;
  email: string;
  name: string;
  password: string;
  roleId: number | null;
  positionId: number | null;
  teamId: number | null;
  managerAccountId: string | null;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  accountId: '',
  email: '',
  name: '',
  password: '',
  roleId: null,
  positionId: null,
  teamId: null,
  managerAccountId: null,
  isActive: true,
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ToastComponent,
    ConfirmDialogComponent,
    PasswordResetDialogComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent {
  private readonly auth = inject(AuthService);
  private readonly api = inject(UsersService);
  protected readonly roles = inject(RolesService);
  protected readonly teams = inject(TeamsService);
  protected readonly positions = inject(PositionsService);
  private readonly localeSvc = inject(LocaleService);

  readonly icons = { UserPlus, Search, Save, Trash2, KeyRound, Power, X, ChevronLeft, ChevronRight, Plus };

  readonly currentUser = this.auth.currentUser;
  // Password reset is superuser-only (matches the backend's require_superuser).
  readonly isAdmin = computed(() => this.auth.isSuperuser());

  // --- filters ---
  readonly roleFilter = signal<number | null>(null);
  readonly teamFilter = signal<number | null>(null);
  readonly statusFilter = signal<'active' | 'inactive' | 'all'>('active');
  readonly search = signal('');

  // --- list / selection ---
  readonly items = signal<UserListItem[]>([]);
  readonly loading = signal(false);
  readonly selectedId = signal<number | null>(null);

  // --- Pagination (client-side; backend returns the full filtered list) ---
  readonly pageSizeOptions = [10, 20, 50, 100] as const;
  readonly pageSize = signal<number>(20);
  readonly page = signal<number>(1);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.items().length / this.pageSize())),
  );

  readonly pagedItems = computed(() => {
    const all = this.items();
    const ps = this.pageSize();
    const p = Math.min(this.page(), Math.max(1, Math.ceil(all.length / ps)));
    const start = (p - 1) * ps;
    return all.slice(start, start + ps);
  });

  // --- form state ---
  readonly creating = signal(false);
  readonly form = signal<FormState>({ ...EMPTY_FORM });
  readonly originalForm = signal<FormState>({ ...EMPTY_FORM });
  readonly saving = signal(false);

  readonly toast = signal<{ message: string; kind: 'success' | 'error' } | null>(null);
  readonly confirmDeleteId = signal<number | null>(null);
  readonly resetPasswordTarget = signal<UserListItem | null>(null);

  // --- Quick-add role / team dialogs ---
  readonly addingRole = signal(false);
  readonly newRoleName = signal('');
  readonly addingTeam = signal(false);
  readonly newTeamName = signal('');

  readonly selected = computed<UserListItem | null>(() => {
    const id = this.selectedId();
    if (id == null) return null;
    return this.items().find((u) => u.id === id) ?? null;
  });

  /** True whenever the create or edit dialog should be visible. */
  readonly dialogOpen = computed(() => this.creating() || this.selectedId() !== null);

  readonly isDirty = computed(() => {
    const a = this.form();
    const b = this.originalForm();
    return JSON.stringify(a) !== JSON.stringify(b);
  });

  // Possible managers: active users whose position matches the parent of the
  // selected user's position. If no position is selected, fall back to all
  // active users (backend enforces the actual rule on save).
  readonly possibleManagers = computed(() => {
    const me = this.selectedId();
    const positionId = this.form().positionId;
    const active = this.items().filter((u) => u.id !== me && u.isActive);
    if (positionId == null) return active;
    const pos = this.positions.byId(positionId);
    // Root positions (no parent) cannot have a manager — empty list.
    if (!pos || pos.parentPositionId == null) return [];
    return active.filter((u) => u.positionId === pos.parentPositionId);
  });

  constructor() {
    effect(() => {
      const filters: UserFilters = {
        roleId: this.roleFilter(),
        teamId: this.teamFilter(),
        isActive:
          this.statusFilter() === 'all' ? null : this.statusFilter() === 'active',
        search: this.search().trim() || undefined,
      };
      this.fetch(filters);
    });

    // Reset to page 1 whenever the data set or page size changes.
    effect(() => {
      this.roleFilter();
      this.teamFilter();
      this.statusFilter();
      this.search();
      this.pageSize();
      this.page.set(1);
    });
  }

  // --- Pagination handlers ---
  setPage(p: number): void {
    this.page.set(Math.max(1, Math.min(p, this.totalPages())));
  }
  setPageSize(size: number): void {
    this.pageSize.set(size);
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

  private fetch(filters: UserFilters): void {
    this.loading.set(true);
    this.api.list(filters).subscribe({
      next: (res) => {
        this.items.set(res);
        this.loading.set(false);
        // Sync selection if it disappeared from the list
        if (!res.some((u) => u.id === this.selectedId())) {
          this.selectedId.set(null);
          this.creating.set(false);
        }
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
      },
    });
  }

  refetch(): void {
    this.fetch({
      roleId: this.roleFilter(),
      teamId: this.teamFilter(),
      isActive: this.statusFilter() === 'all' ? null : this.statusFilter() === 'active',
      search: this.search().trim() || undefined,
    });
  }

  startCreate(): void {
    this.creating.set(true);
    this.selectedId.set(null);
    const fresh: FormState = {
      ...EMPTY_FORM,
      roleId: 6, // worker by default
    };
    this.form.set(fresh);
    this.originalForm.set({ ...fresh, password: '' });
  }

  selectUser(u: UserListItem): void {
    this.creating.set(false);
    this.selectedId.set(u.id);
    const f: FormState = {
      accountId: u.accountId,
      email: u.email,
      name: u.name,
      password: '',
      roleId: u.roleId,
      positionId: u.positionId ?? null,
      teamId: u.teamId ?? null,
      managerAccountId: u.managerAccountId ?? null,
      isActive: u.isActive,
    };
    this.form.set(f);
    this.originalForm.set(f);
  }

  patch<K extends keyof FormState>(key: K, value: FormState[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  save(): void {
    if (this.saving()) return;
    if (this.creating()) {
      const f = this.form();
      if (!f.accountId || !f.email || !f.name || !f.password || !f.roleId) {
        this.flashToast(this.localeSvc.t('common.required'), 'error');
        return;
      }
      const payload: UserCreatePayload = {
        accountId: f.accountId,
        email: f.email,
        name: f.name,
        password: f.password,
        roleId: f.roleId,
        positionId: f.positionId ?? null,
        teamId: f.teamId ?? null,
        managerAccountId: f.managerAccountId ?? null,
        isActive: f.isActive,
      };
      this.saving.set(true);
      this.api.create(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.flashToast(this.localeSvc.t('users.toast_created'), 'success');
          this.closeDialog();
          this.refetch();
        },
        error: (err) => {
          this.saving.set(false);
          const detail = err?.error?.detail;
          this.flashToast(typeof detail === 'string' ? detail : this.localeSvc.t('common.failed_save'), 'error');
        },
      });
    } else {
      const id = this.selectedId();
      if (id == null) return;
      const f = this.form();
      const payload: UserUpdatePayload = {
        email: f.email,
        name: f.name,
        roleId: f.roleId ?? undefined,
        positionId: f.positionId ?? null,
        teamId: f.teamId ?? null,
        managerAccountId: f.managerAccountId ?? null,
        isActive: f.isActive,
      };
      this.saving.set(true);
      this.api.update(id, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.flashToast(this.localeSvc.t('common.saved'), 'success');
          this.closeDialog();
          this.refetch();
        },
        error: (err) => {
          this.saving.set(false);
          const detail = err?.error?.detail;
          this.flashToast(typeof detail === 'string' ? detail : this.localeSvc.t('common.failed_save'), 'error');
        },
      });
    }
  }

  cancelEdit(): void {
    if (this.creating()) {
      this.creating.set(false);
      this.form.set({ ...EMPTY_FORM });
      this.originalForm.set({ ...EMPTY_FORM });
    } else {
      this.form.set({ ...this.originalForm() });
    }
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
    this.api.softDelete(id).subscribe({
      next: () => {
        this.flashToast(this.localeSvc.t('users.toast_deactivated'), 'success');
        this.refetch();
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : this.localeSvc.t('common.failed_delete'), 'error');
      },
    });
  }

  reactivate(): void {
    const id = this.selectedId();
    if (id == null) return;
    this.api.activate(id).subscribe({
      next: () => {
        this.flashToast(this.localeSvc.t('users.toast_reactivated'), 'success');
        this.refetch();
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : this.localeSvc.t('common.failed_save'), 'error');
      },
    });
  }

  openPasswordReset(): void {
    const u = this.selected();
    if (!u) return;
    this.resetPasswordTarget.set(u);
  }
  cancelPasswordReset(): void {
    this.resetPasswordTarget.set(null);
  }
  applyPasswordReset(newPassword: string): void {
    const u = this.resetPasswordTarget();
    this.resetPasswordTarget.set(null);
    if (!u) return;
    this.api.resetPassword(u.id, newPassword).subscribe({
      next: () => this.flashToast(this.localeSvc.t('users.toast_pwd_reset'), 'success'),
      error: (err) => {
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : this.localeSvc.t('users.toast_pwd_failed'), 'error');
      },
    });
  }

  private flashToast(message: string, kind: 'success' | 'error'): void {
    this.toast.set({ message, kind });
    setTimeout(() => this.toast.set(null), 2500);
  }

  closeDialog(): void {
    this.creating.set(false);
    this.selectedId.set(null);
    this.form.set({ ...EMPTY_FORM });
    this.originalForm.set({ ...EMPTY_FORM });
  }

  roleLabel(roleId: number | null | undefined): string {
    return this.roles.byId(roleId ?? undefined)?.name ?? '—';
  }

  roleCodeFor(roleId: number | null | undefined): string {
    return this.roles.byId(roleId ?? undefined)?.code ?? '';
  }

  teamName(teamId: number | null | undefined): string {
    return this.teams.byId(teamId ?? undefined)?.name ?? '—';
  }

  /** Resolve a manager_account_id to a display name using the loaded items list. */
  managerName(managerAccountId: string | null | undefined): string {
    if (!managerAccountId) return '—';
    const found = this.items().find((u) => u.accountId === managerAccountId);
    return found?.name ?? managerAccountId;
  }

  // --- Quick-add role ---
  openAddRole(): void {
    this.newRoleName.set('');
    this.addingRole.set(true);
  }
  cancelAddRole(): void {
    this.addingRole.set(false);
  }
  submitAddRole(): void {
    // Role codes are immutable in the backend (CLAUDE.md); creating new roles
    // is not supported. Direct users to the management screen for edits.
    this.addingRole.set(false);
    this.flashToast(this.localeSvc.t('users.role_create_disabled'), 'error');
  }

  // --- Quick-add team ---
  openAddTeam(): void {
    this.newTeamName.set('');
    this.addingTeam.set(true);
  }
  cancelAddTeam(): void {
    this.addingTeam.set(false);
  }
  submitAddTeam(): void {
    const name = this.newTeamName().trim();
    if (!name) {
      this.flashToast(this.localeSvc.t('common.required'), 'error');
      return;
    }
    if (this.teams.list().some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      this.flashToast(this.localeSvc.t('users.team_exists'), 'error');
      return;
    }
    this.teams.create({ name }).subscribe({
      next: (created) => {
        this.addingTeam.set(false);
        this.newTeamName.set('');
        this.teamFilter.set(created.id);
        this.flashToast(this.localeSvc.t('users.toast_team_created'), 'success');
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : this.localeSvc.t('common.failed_save'), 'error');
      },
    });
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const tag = this.localeSvc.locale() === 'en' ? 'en-GB' : 'tr-TR';
    return d.toLocaleDateString(tag, { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
