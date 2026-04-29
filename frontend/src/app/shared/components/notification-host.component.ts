import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, AlertCircle, Check, Info, X } from 'lucide-angular';

import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-notification-host',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      @for (n of notify.items(); track n.id) {
        <div class="toast" [class.error]="n.kind === 'error'" [class.info]="n.kind === 'info'">
          @switch (n.kind) {
            @case ('error')   { <lucide-icon [img]="alertIcon" size="14"></lucide-icon> }
            @case ('success') { <lucide-icon [img]="checkIcon" size="14"></lucide-icon> }
            @default          { <lucide-icon [img]="infoIcon" size="14"></lucide-icon> }
          }
          <span class="msg">{{ n.message }}</span>
          <button type="button" class="x" (click)="notify.dismiss(n.id)" aria-label="Kapat">
            <lucide-icon [img]="closeIcon" size="11"></lucide-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { position: fixed; bottom: 24px; right: 24px; z-index: 400; pointer-events: none; }
    .stack { display: flex; flex-direction: column-reverse; gap: 8px; }
    .toast {
      pointer-events: auto;
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; min-width: 240px; max-width: 360px;
      background: var(--c-surface); border: 1px solid var(--c-border-hover);
      border-radius: 8px; color: var(--c-text-primary); font-size: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .toast.error { background: var(--c-red); color: #fff; border-color: var(--c-red); }
    .toast.info { border-color: var(--c-blue); }
    .toast > lucide-icon:first-child { flex-shrink: 0; }
    .msg { flex: 1; }
    .x { background: transparent; border: none; cursor: pointer; color: inherit; opacity: 0.6; padding: 2px; }
    .x:hover { opacity: 1; }
  `],
})
export class NotificationHostComponent {
  protected readonly notify = inject(NotificationService);
  readonly alertIcon = AlertCircle;
  readonly checkIcon = Check;
  readonly infoIcon = Info;
  readonly closeIcon = X;
}
