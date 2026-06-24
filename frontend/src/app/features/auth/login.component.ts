import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  AlertCircle,
  Loader2,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
} from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { LocaleService } from '../../core/services/locale.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { environment } from '../../../environments/environment';

interface SeedAccount {
  accountId: string;
  password: string;
  label: string;
  color: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly localeSvc = inject(LocaleService);

  readonly showSeedHint = environment.showSeedAccountsHint;

  readonly icons = { UserIcon, Lock, AlertCircle, Loader2, Eye, EyeOff };

  readonly accountId = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly hintOpen = signal(false);

  readonly seedAccounts: SeedAccount[] = [
    { accountId: 'ADM001', password: 'admin123', label: 'Admin', color: 'var(--c-teal)' },
    { accountId: 'HR001', password: 'hr123', label: 'HR', color: 'var(--c-blue)' },
    { accountId: 'MGR001', password: 'mgr123', label: 'Manager', color: 'var(--c-purple)' },
    { accountId: 'TL001', password: 'tl123', label: 'Tech Lead', color: 'var(--c-amber)' },
    { accountId: 'QA001', password: 'qa123', label: 'QA', color: 'var(--c-pink)' },
    { accountId: 'EMP001', password: 'pass123', label: 'Worker', color: 'var(--c-green)' },
  ];

  submit(): void {
    this.error.set(null);
    const accountId = this.accountId().trim();
    const password = this.password();
    if (!accountId || !password) {
      this.error.set(this.localeSvc.t('login.error_required'));
      return;
    }
    this.loading.set(true);
    this.auth.login(accountId, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        const detail = err?.error?.detail;
        this.error.set(
          typeof detail === 'string' ? detail : this.localeSvc.t('login.error_invalid'),
        );
      },
    });
  }

  pickSeed(account: SeedAccount): void {
    this.accountId.set(account.accountId);
    this.password.set(account.password);
  }

  toggleHint(): void {
    this.hintOpen.update((v) => !v);
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }
}
