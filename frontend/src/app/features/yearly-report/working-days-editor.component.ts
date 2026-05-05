import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X } from 'lucide-angular';

import { TR_MONTHS_FULL } from '../../shared/utils/cell-tone';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-working-days-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="close.emit()"></div>
    <div class="dialog">
      <header>
        <div>
          <div class="title">{{ 'yearly_report.editor_title' | t : { year: year() } }}</div>
          <div class="hint">{{ 'yearly_report.editor_hint' | t }}</div>
        </div>
        <button class="x" (click)="close.emit()" [attr.aria-label]="'common.close' | t">
          <lucide-icon [img]="closeIcon" size="16"></lucide-icon>
        </button>
      </header>

      <div class="grid">
        @for (m of months; track m.idx) {
          <div class="cell">
            <label>{{ m.label }}</label>
            <div class="input-row">
              <input
                type="number"
                min="0" max="31" step="1"
                [disabled]="!canEdit()"
                [ngModel]="values()[m.idx]"
                (ngModelChange)="setValue(m.idx, $event)"
              />
              <span class="unit">{{ 'common.days' | t }}</span>
            </div>
          </div>
        }
      </div>

      <footer>
        <div class="totals">
          {{ 'yearly_report.editor_total' | t }}
          <span class="strong">{{ totalDays() }}</span> {{ 'common.days' | t }} ·
          {{ 'yearly_report.editor_target' | t }}
          <span class="teal">{{ totalHours() }}</span> {{ 'yearly_report.editor_per_person' | t }}
        </div>
        <div class="actions">
          <button class="btn-secondary" (click)="close.emit()">{{ (canEdit() ? 'common.cancel' : 'common.close') | t }}</button>
          @if (canEdit()) {
            <button class="btn-primary" (click)="save.emit(values())">{{ 'common.save' | t }}</button>
          }
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host { position: fixed; inset: 0; z-index: 200; display: block; }
    .overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); }
    .dialog {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: var(--c-surface); backdrop-filter: blur(30px);border: 1px solid var(--c-border-hover); border-radius: 10px;
      width: calc(100% - 40px); max-width: 540px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    header {
      padding: 16px 20px; border-bottom: 1px solid var(--c-border);
      display: flex; justify-content: space-between; align-items: center;
    }
    .title { font-size: 15px; font-weight: 500; color: var(--c-text-primary); }
    .hint  { font-size: 11px; color: var(--c-text-muted); margin-top: 2px; }
    .x { background: transparent; border: none; cursor: pointer; color: var(--c-text-muted); padding: 4px; border-radius: 4px; }
    .x:hover { color: var(--c-text-primary); background: var(--c-surface-hover); }
    .grid { padding: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .cell label {
      display: block; font-size: 11px; color: var(--c-text-secondary);
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;
    }
    .input-row { display: flex; align-items: center; gap: 6px; }
    input[type=number] {
      width: 100%; padding: 8px 10px; box-sizing: border-box;
      background: var(--c-bg); border: 1px solid var(--c-border); border-radius: 6px;
      color: var(--c-text-primary); font-size: 13px; outline: none; font-family: inherit;
      font-variant-numeric: tabular-nums;
    }
    input[type=number]:disabled { background: var(--c-surface-deep); color: var(--c-text-muted); }
    .unit { font-size: 11px; color: var(--c-text-muted); white-space: nowrap; }
    footer {
      padding: 14px 20px; border-top: 1px solid var(--c-border);
      display: flex; justify-content: space-between; align-items: center; gap: 8px;
    }
    .totals { font-size: 11px; color: var(--c-text-muted); }
    .totals .strong { color: var(--c-text-primary); font-weight: 500; }
    .totals .teal { color: var(--c-teal); font-weight: 500; }
    .actions { display: flex; gap: 8px; }
    .btn-secondary {
      padding: 8px 16px; background: transparent; border: 1px solid var(--c-border);
      border-radius: 6px; color: var(--c-text-secondary); font-size: 13px; cursor: pointer; font-family: inherit;
    }
    .btn-primary {
      padding: 8px 16px; background: var(--c-teal); border: none; border-radius: 6px;
      color: var(--c-bg); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
    }
  `],
})
export class WorkingDaysEditorComponent {
  readonly year = input.required<number>();
  readonly initial = input.required<number[]>();
  readonly canEdit = input<boolean>(true);

  readonly save = output<number[]>();
  readonly close = output<void>();

  readonly closeIcon = X;
  readonly months = TR_MONTHS_FULL.map((label, idx) => ({ idx, label }));

  readonly values = signal<number[]>([]);
  readonly totalDays = computed(() => this.values().reduce((s, v) => s + v, 0));
  readonly totalHours = computed(() => this.totalDays() * 8);

  constructor() {
    // Sync external initial → local editable copy.
    queueMicrotask(() => this.values.set([...this.initial()]));
  }

  setValue(idx: number, raw: number | string): void {
    const num = typeof raw === 'string' ? parseInt(raw, 10) || 0 : raw || 0;
    const clamped = Math.max(0, Math.min(31, num));
    this.values.update((arr) => {
      const copy = [...arr];
      copy[idx] = clamped;
      return copy;
    });
  }
}
