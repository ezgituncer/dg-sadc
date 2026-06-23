import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, KeyRound, X } from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { LocaleService } from '../../core/services/locale.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancel.emit()"></div>
    <div class="dialog">
      <header>
        <div class="title">
          <lucide-icon [img]="keyIcon" size="14"></lucide-icon>
          {{ 'profile.change_password' | t }}
        </div>
        <button class="x" (click)="cancel.emit()" [attr.aria-label]="'common.close' | t">
          <lucide-icon [img]="closeIcon" size="14"></lucide-icon>
        </button>
      </header>

      <div class="body">
        <label>{{ 'profile.current_password' | t }}</label>
        <input type="password" [ngModel]="current()" (ngModelChange)="current.set($event)" autofocus />

        <label>{{ 'profile.new_password' | t }}</label>
        <input type="password" [ngModel]="next()" (ngModelChange)="next.set($event)" />

        <label>{{ 'profile.confirm_password' | t }}</label>
        <input
          type="password"
          [ngModel]="confirm()"
          (ngModelChange)="confirm.set($event)"
          (keydown.enter)="submit()"
        />

        @if (error()) {
          <div class="error">{{ error() }}</div>
        }
      </div>

      <footer>
        <button class="btn-secondary" (click)="cancel.emit()">{{ 'common.cancel' | t }}</button>
        <button class="btn-primary" [disabled]="saving()" (click)="submit()">
          {{ 'profile.change_password' | t }}
        </button>
      </footer>
    </div>
  `,
  styles: [`
    :host { position: fixed; inset: 0; z-index: 250; display: block; }
    .overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); }
    .dialog {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: var(--c-surface-solid); border: 1px solid var(--c-border-hover); border-radius: 10px;
      width: calc(100% - 40px); max-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    header { padding: 14px 18px; border-bottom: 1px solid var(--c-border); display: flex; justify-content: space-between; align-items: center; }
    .title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: var(--c-text-primary); }
    .x { background: transparent; border: none; cursor: pointer; color: var(--c-text-muted); padding: 4px; border-radius: 4px; }
    .body { padding: 18px; }
    label { display: block; font-size: 11px; color: var(--c-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px; }
    label:not(:first-child) { margin-top: 14px; }
    input {
      width: 100%; padding: 10px 12px; box-sizing: border-box;
      background: var(--c-bg); border: 1px solid var(--c-border); border-radius: 6px;
      color: var(--c-text-primary); font-size: 13px; outline: none; font-family: inherit;
    }
    input:focus { border-color: var(--c-border-focus); }
    .error { margin-top: 10px; font-size: 11px; color: var(--c-red); }
    footer { padding: 12px 18px; border-top: 1px solid var(--c-border); display: flex; justify-content: flex-end; gap: 8px; }
    .btn-secondary { padding: 8px 14px; background: transparent; border: 1px solid var(--c-border); border-radius: 6px; color: var(--c-text-secondary); font-size: 12px; cursor: pointer; font-family: inherit; }
    .btn-primary { padding: 8px 14px; background: var(--c-teal); border: none; border-radius: 6px; color: var(--c-bg); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ChangePasswordDialogComponent {
  private readonly auth = inject(AuthService);
  private readonly localeSvc = inject(LocaleService);

  readonly done = output<void>();
  readonly cancel = output<void>();

  readonly keyIcon = KeyRound;
  readonly closeIcon = X;
  readonly current = signal('');
  readonly next = signal('');
  readonly confirm = signal('');
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  submit(): void {
    const cur = this.current();
    const nw = this.next();
    if (!cur) {
      this.error.set(this.localeSvc.t('profile.current_required'));
      return;
    }
    if (nw.length < 6) {
      this.error.set(this.localeSvc.t('profile.pwd_too_short'));
      return;
    }
    if (nw !== this.confirm()) {
      this.error.set(this.localeSvc.t('profile.pwd_mismatch'));
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.auth.changePassword(cur, nw).subscribe({
      next: () => {
        this.saving.set(false);
        this.done.emit();
      },
      error: (err) => {
        this.saving.set(false);
        const detail = err?.error?.detail;
        // 400 → current password incorrect; otherwise generic failure.
        this.error.set(
          err?.status === 400
            ? this.localeSvc.t('profile.current_wrong')
            : typeof detail === 'string'
              ? detail
              : this.localeSvc.t('common.failed_save'),
        );
      },
    });
  }
}
