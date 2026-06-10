import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  ShieldCheck,
  Plus,
  Save,
  Trash2,
  X,
  Lock,
} from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { LocaleService } from '../../core/services/locale.service';
import { RolesService } from '../../core/services/users.service';
import { Permission, Role } from '../../core/models/admin';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { ToastComponent } from '../../shared/components/toast.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';

/** A feature row in the permission matrix, with its view/manage permission codes. */
interface FeatureRow {
  feature: string;
  label: string;
  viewCode: string | null;
  manageCode: string | null;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    ToastComponent,
    ConfirmDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.css',
})
export class RolesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly rolesSvc = inject(RolesService);
  private readonly localeSvc = inject(LocaleService);

  readonly icons = { ShieldCheck, Plus, Save, Trash2, X, Lock };

  readonly canManage = computed(() => this.auth.hasPermission('roles.manage'));

  readonly roles = signal<Role[]>([]);
  readonly catalog = signal<Permission[]>([]);
  readonly loading = signal(false);
  readonly toast = signal<{ message: string; kind: 'success' | 'error' } | null>(null);
  readonly confirmDeleteId = signal<number | null>(null);

  // --- editor state ---
  // null = nothing open; 0 = creating new; >0 = editing that role id.
  readonly editingId = signal<number | null>(null);
  readonly formName = signal('');
  readonly formDescription = signal('');
  readonly selectedPerms = signal<Set<string>>(new Set());
  readonly saving = signal(false);

  /** Feature rows derived from the catalog (one row per feature, view+manage columns). */
  readonly featureRows = computed<FeatureRow[]>(() => {
    const byFeature = new Map<string, FeatureRow>();
    // Preserve catalog order (it's grouped feature, then kind).
    for (const p of this.catalog()) {
      let row = byFeature.get(p.feature);
      if (!row) {
        row = { feature: p.feature, label: this.featureLabel(p.feature), viewCode: null, manageCode: null };
        byFeature.set(p.feature, row);
      }
      if (p.kind === 'view') row.viewCode = p.code;
      else if (p.kind === 'manage') row.manageCode = p.code;
    }
    return Array.from(byFeature.values());
  });

  readonly editingRole = computed<Role | null>(() => {
    const id = this.editingId();
    if (id == null || id === 0) return null;
    return this.roles().find((r) => r.id === id) ?? null;
  });

  /** Superuser roles (ADMIN) implicitly hold every permission — matrix is locked. */
  readonly editorLocked = computed(() => this.editingRole()?.isSuperuser ?? false);

  ngOnInit(): void {
    this.loading.set(true);
    this.rolesSvc.permissions().subscribe({
      next: (perms) => this.catalog.set(perms),
      error: () => this.catalog.set([]),
    });
    this.rolesSvc
      .refresh()
      .then((rows) => this.roles.set(rows))
      .catch(() => this.roles.set([]))
      .finally(() => this.loading.set(false));
  }

  featureLabel(feature: string): string {
    const key = `roles.feature_${feature}`;
    const translated = this.localeSvc.t(key);
    // Fall back to a title-cased feature key if no translation exists.
    return translated === key ? feature : translated;
  }

  // --- list helpers ---
  permCount(role: Role): number {
    return role.isSuperuser ? this.catalog().length : role.permissions.length;
  }

  // --- editor ---
  startCreate(): void {
    this.editingId.set(0);
    this.formName.set('');
    this.formDescription.set('');
    this.selectedPerms.set(new Set());
  }

  startEdit(role: Role): void {
    this.editingId.set(role.id);
    this.formName.set(role.name);
    this.formDescription.set(role.description ?? '');
    this.selectedPerms.set(new Set(role.permissions));
  }

  closeEditor(): void {
    this.editingId.set(null);
  }

  isPermSelected(code: string | null): boolean {
    if (!code) return false;
    if (this.editorLocked()) return true;
    return this.selectedPerms().has(code);
  }

  togglePerm(code: string | null): void {
    if (!code || this.editorLocked() || !this.canManage()) return;
    this.selectedPerms.update((s) => {
      const next = new Set(s);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  readonly isFormValid = computed(() => this.formName().trim().length > 0);

  save(): void {
    if (!this.isFormValid() || this.saving() || !this.canManage()) return;
    const id = this.editingId();
    const payload = {
      name: this.formName().trim(),
      description: this.formDescription().trim() || null,
      permissions: Array.from(this.selectedPerms()),
    };
    this.saving.set(true);
    const op$ =
      id === 0
        ? this.rolesSvc.create(payload)
        : this.rolesSvc.update(id!, payload);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.flashToast(this.localeSvc.t(id === 0 ? 'roles.created' : 'common.saved'), 'success');
        this.editingId.set(null);
        this.rolesSvc.refresh().then((rows) => this.roles.set(rows));
      },
      error: (err) => {
        this.saving.set(false);
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : this.localeSvc.t('common.failed_save'), 'error');
      },
    });
  }

  askDelete(role: Role): void {
    if (role.isSystem || !this.canManage()) return;
    this.confirmDeleteId.set(role.id);
  }
  cancelDelete(): void {
    this.confirmDeleteId.set(null);
  }
  confirmDelete(): void {
    const id = this.confirmDeleteId();
    if (id == null) return;
    this.confirmDeleteId.set(null);
    this.rolesSvc.remove(id).subscribe({
      next: () => {
        this.flashToast(this.localeSvc.t('common.deleted'), 'success');
        if (this.editingId() === id) this.editingId.set(null);
        this.rolesSvc.refresh().then((rows) => this.roles.set(rows));
      },
      error: (err) => {
        const detail = err?.error?.detail;
        this.flashToast(typeof detail === 'string' ? detail : this.localeSvc.t('common.failed_delete'), 'error');
      },
    });
  }

  private flashToast(message: string, kind: 'success' | 'error'): void {
    this.toast.set({ message, kind });
    setTimeout(() => this.toast.set(null), 2500);
  }
}
