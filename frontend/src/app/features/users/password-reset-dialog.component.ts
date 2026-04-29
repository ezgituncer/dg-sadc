import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, KeyRound, X } from 'lucide-angular';

@Component({
  selector: 'app-password-reset-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancel.emit()"></div>
    <div class="dialog">
      <header>
        <div class="title">
          <lucide-icon [img]="keyIcon" size="14"></lucide-icon>
          {{ targetName() }} için parola sıfırla
        </div>
        <button class="x" (click)="cancel.emit()" aria-label="Kapat">
          <lucide-icon [img]="closeIcon" size="14"></lucide-icon>
        </button>
      </header>

      <div class="body">
        <label>Yeni parola</label>
        <input
          type="password"
          [ngModel]="value()"
          (ngModelChange)="value.set($event)"
          placeholder="En az 6 karakter"
          autofocus
        />
        @if (error()) {
          <div class="error">{{ error() }}</div>
        }
      </div>

      <footer>
        <button class="btn-secondary" (click)="cancel.emit()">İptal</button>
        <button class="btn-primary" (click)="submit()">Sıfırla</button>
      </footer>
    </div>
  `,
  styles: [`
    :host { position: fixed; inset: 0; z-index: 250; display: block; }
    .overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); }
    .dialog {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: var(--c-surface); border: 1px solid var(--c-border-hover); border-radius: 10px;
      width: calc(100% - 40px); max-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    header { padding: 14px 18px; border-bottom: 1px solid var(--c-border); display: flex; justify-content: space-between; align-items: center; }
    .title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: var(--c-text-primary); }
    .x { background: transparent; border: none; cursor: pointer; color: var(--c-text-muted); padding: 4px; border-radius: 4px; }
    .body { padding: 18px; }
    label { display: block; font-size: 11px; color: var(--c-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    input {
      width: 100%; padding: 10px 12px; box-sizing: border-box;
      background: var(--c-bg); border: 1px solid var(--c-border); border-radius: 6px;
      color: var(--c-text-primary); font-size: 13px; outline: none; font-family: inherit;
    }
    .error { margin-top: 8px; font-size: 11px; color: var(--c-red); }
    footer { padding: 12px 18px; border-top: 1px solid var(--c-border); display: flex; justify-content: flex-end; gap: 8px; }
    .btn-secondary { padding: 8px 14px; background: transparent; border: 1px solid var(--c-border); border-radius: 6px; color: var(--c-text-secondary); font-size: 12px; cursor: pointer; font-family: inherit; }
    .btn-primary { padding: 8px 14px; background: var(--c-amber); border: none; border-radius: 6px; color: var(--c-bg); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
  `],
})
export class PasswordResetDialogComponent {
  readonly targetName = input.required<string>();
  readonly confirm = output<string>();
  readonly cancel = output<void>();

  readonly keyIcon = KeyRound;
  readonly closeIcon = X;
  readonly value = signal('');
  readonly error = signal<string | null>(null);

  submit(): void {
    const v = this.value();
    if (v.length < 6) {
      this.error.set('Parola en az 6 karakter olmalı');
      return;
    }
    this.confirm.emit(v);
  }
}
