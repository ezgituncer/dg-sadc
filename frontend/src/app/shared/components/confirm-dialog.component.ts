import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancel.emit()"></div>
    <div class="dialog">
      <div class="title">{{ title() }}</div>
      <div class="message">{{ message() }}</div>
      <div class="actions">
        <button type="button" class="btn-cancel" (click)="cancel.emit()">İptal</button>
        <button
          type="button"
          class="btn-confirm"
          [class.danger]="danger()"
          (click)="confirm.emit()"
        >
          {{ confirmLabel() }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host { position: fixed; inset: 0; z-index: 300; display: block; }
      .overlay { position: absolute; inset: 0; background: rgba(8, 16, 32, 0.65); backdrop-filter: blur(2px); }
      .dialog {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: var(--c-surface-solid); border: 1px solid var(--c-border-hover);
        border-radius: 10px; padding: 20px; min-width: 360px; max-width: 440px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }
      .title { font-size: 15px; font-weight: 500; margin-bottom: 6px; color: var(--c-text-primary); }
      .message { font-size: 13px; color: var(--c-text-secondary); line-height: 1.5; margin-bottom: 18px; }
      .actions { display: flex; justify-content: flex-end; gap: 8px; }
      .btn-cancel, .btn-confirm {
        padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 500;
        cursor: pointer; font-family: inherit; border: none;
      }
      .btn-cancel { background: transparent; border: 1px solid var(--c-border); color: var(--c-text-secondary); }
      .btn-confirm { background: var(--c-teal); color: var(--c-bg); }
      .btn-confirm.danger { background: var(--c-red); color: #fff; }
    `,
  ],
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input<string>('Onayla');
  readonly danger = input<boolean>(false);
  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
