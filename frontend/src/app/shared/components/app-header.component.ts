import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, LogOut, KeyRound } from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { LocaleService } from '../../core/services/locale.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { RoleCode } from '../../core/models/role';
import { ChangePasswordDialogComponent } from './change-password-dialog.component';
import { ToastComponent } from './toast.component';

const ROLE_LABEL: Record<RoleCode, string> = {
  ADMIN: 'Admin',
  HR: 'HR',
  MANAGER: 'Manager',
  TECH_LEAD: 'Technical Lead',
  QA_SPECIALIST: 'QA Specialist',
  WORKER: 'Worker',
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    TranslatePipe,
    ChangePasswordDialogComponent,
    ToastComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.css',
})
export class AppHeaderComponent {
  private readonly auth = inject(AuthService);
  protected readonly localeService = inject(LocaleService);

  readonly currentUser = this.auth.currentUser;
  readonly logOutIcon = LogOut;
  readonly keyIcon = KeyRound;

  readonly profileOpen = signal(false);
  readonly pwdDialogOpen = signal(false);
  readonly toast = signal<{ message: string; kind: 'success' | 'error' } | null>(null);

  readonly initials = computed<string>(() => {
    const name = this.currentUser()?.name ?? '';
    return name.split(' ').map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
  });

  readonly firstName = computed<string>(() => {
    const name = this.currentUser()?.name ?? '';
    return name.split(' ')[0] ?? '';
  });

  readonly roleLabel = computed<string>(() => {
    const role = this.auth.roleCode();
    return role ? ROLE_LABEL[role] : '';
  });

  toggleProfile(): void { this.profileOpen.update((v) => !v); }
  closeProfile(): void { this.profileOpen.set(false); }
  toggleLocale(): void { this.localeService.toggle(); }
  logout(): void {
    this.profileOpen.set(false);
    this.auth.logout();
  }

  openPasswordDialog(): void {
    this.profileOpen.set(false);
    this.pwdDialogOpen.set(true);
  }
  onPasswordChanged(): void {
    this.pwdDialogOpen.set(false);
    this.toast.set({ message: this.localeService.t('profile.pwd_changed'), kind: 'success' });
    setTimeout(() => this.toast.set(null), 2500);
  }
}
