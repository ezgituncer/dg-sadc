import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideAngularModule, AlertCircle, Check } from 'lucide-angular';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast" [class.error]="kind() === 'error'">
      @if (kind() === 'error') {
        <lucide-icon [img]="alertIcon" size="14"></lucide-icon>
      } @else {
        <lucide-icon [img]="checkIcon" size="14" class="check"></lucide-icon>
      }
      {{ message() }}
    </div>
  `,
  styles: [
    `
      :host { position: fixed; bottom: 24px; right: 24px; z-index: 200; pointer-events: none; }
      .toast {
        padding: 12px 18px; background: var(--c-surface);
        border: 1px solid var(--c-border-hover); border-radius: 8px;
        color: var(--c-text-primary); font-size: 13px; font-weight: 500;
        display: flex; align-items: center; gap: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); pointer-events: auto;
      }
      .toast.error {
        background: var(--c-red); color: #fff; border-color: var(--c-red);
      }
      .check { color: var(--c-green); }
    `,
  ],
})
export class ToastComponent {
  readonly message = input.required<string>();
  readonly kind = input<'success' | 'error'>('success');
  readonly alertIcon = AlertCircle;
  readonly checkIcon = Check;
}
