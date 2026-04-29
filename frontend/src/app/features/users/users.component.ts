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
} from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import {
  RolesService,
  TeamsService,
  UsersService,
  UserFilters,
} from '../../core/services/users.service';
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
  position: string;
  roleId: number | null;
  teamId: number | null;
  managerAccountId: string | null;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  accountId: '',
  email: '',
  name: '',
  password: '',
  position: '',
  roleId: null,
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

  readonly icons = { UserPlus, Search, Save, Trash2, KeyRound, Power, X };

  readonly currentUser = this.auth.currentUser;
  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));

  // --- filters ---
  readonly roleFilter = signal<number | null>(null);
  readonly teamFilter = signal<number | null>(null);
  readonly statusFilter = signal<'active' | 'inactive' | 'all'>('active');
  readonly search = signal('');

  // --- list / selection ---
  readonly items = signal<UserListItem[]>([]);
  readonly loading = signal(false);
  readonly selectedId = signal<number | null>(null);

  // --- form state ---
  readonly creating = signal(false);
  readonly form = signal<FormState>({ ...EMPTY_FORM });
  readonly originalForm = signal<FormState>({ ...EMPTY_FORM });
  readonly saving = signal(false);

  readonly toast = signal<{ message: string; kind: 'success' | 'error' } | null>(null);
  readonly confirmDeleteId = signal<number | null>(null);
  readonly resetPasswordTarget = signal<UserListItem | null>(null);

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

  // Possible managers: every active non-self user with role MANAGER (extend later if needed).
  readonly possibleManagers = computed(() => {
    const me = this.selectedId();
    return this.items().filter(
      (u) => u.id !== me && u.isActive && (u.roleCode === 'MANAGER'),
    );
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
      position: u.position ?? '',
      roleId: u.roleId,
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
        this.flashToast('Zorunlu alanları doldur', 'error');
        return;
      }
      const payload: UserCreatePayload = {
        accountId: f.accountId,
        email: f.email,
        name: f.name,
        password: f.password,
        position: f.position || null,
        roleId: f.roleId,
        teamId: f.teamId ?? null,
        managerAccountId: f.managerAccountId ?? null,
        isActive: f.isActive,
      };
      this.saving.set(true);
      this.api.create(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.flashToast('Kullanıcı oluşturuldu', 'success');
          this.closeDialog();
          this.refetch();
        },
        error: (err) => {
          this.saving.set(false);
          const detail = err?.error?.detail;
          this.flashToast(typeof detail === 'string' ? detail : 'Kaydedilemedi', 'error');
        },
      });
    } else {
      const id = this.selectedId();
      if (id == null) return;
      const f = this.form();
      const payload: UserUpdatePayload = {
        email: f.email,
        name: f.name,
        position: f.position || null,
        roleId: f.roleId ?? undefined,
        teamId: f.teamId ?? null,
        managerAccountId: f.managerAccountId ?? null,
        isActive: f.isActive,
      };
      this.saving.set(true);
      this.api.update(id, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.flashToast('Kayıt güncellendi', 'success');
          this.closeDialog();
          this.refetch();
        },
        error: (err) => {
          this.saving.set(false);
          const detail = err?.error?.detail;
          this.flashToast(typeof detail === 'string' ? detail : 'Kaydedilemedi', 'error');
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
        this.flashToast('Kullanıcı pasif edildi', 'success');
        this.refetch();
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : 'Silinemedi', 'error');
      },
    });
  }

  reactivate(): void {
    const id = this.selectedId();
    if (id == null) return;
    this.api.activate(id).subscribe({
      next: () => {
        this.flashToast('Kullanıcı yeniden aktif', 'success');
        this.refetch();
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : 'Aktive edilemedi', 'error');
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
      next: () => this.flashToast('Parola sıfırlandı', 'success'),
      error: (err) => {
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : 'Parola sıfırlanamadı', 'error');
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

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
