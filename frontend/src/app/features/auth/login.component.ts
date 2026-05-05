import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
} from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { LocaleService } from '../../core/services/locale.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { environment } from '../../../environments/environment';

interface SeedAccount {
  email: string;
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

  readonly icons = { Mail, Lock, AlertCircle, Loader2 };

  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly hintOpen = signal(false);

  readonly seedAccounts: SeedAccount[] = [
    { email: 'admin@company.com', password: 'admin123', label: 'Admin', color: 'var(--c-teal)' },
    { email: 'hr.manager@company.com', password: 'hr123', label: 'HR', color: 'var(--c-blue)' },
    { email: 'eng.manager@company.com', password: 'mgr123', label: 'Manager', color: 'var(--c-purple)' },
    { email: 'frontend.lead@company.com', password: 'tl123', label: 'Tech Lead', color: 'var(--c-amber)' },
    { email: 'qa.lead@company.com', password: 'qa123', label: 'QA', color: 'var(--c-pink)' },
    { email: 'developer1@company.com', password: 'pass123', label: 'Worker', color: 'var(--c-green)' },
  ];

  submit(): void {
    this.error.set(null);
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password) {
      this.error.set(this.localeSvc.t('login.error_required'));
      return;
    }
    this.loading.set(true);
    this.auth.login(email, password).subscribe({
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
    this.email.set(account.email);
    this.password.set(account.password);
  }

  toggleHint(): void {
    this.hintOpen.update((v) => !v);
  }
}
