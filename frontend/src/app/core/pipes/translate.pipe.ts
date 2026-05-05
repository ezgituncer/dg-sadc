import { inject, Pipe, PipeTransform } from '@angular/core';

import { LocaleService } from '../services/locale.service';

/**
 * Lookup a translation key in the current locale dictionary.
 *
 * Usage:
 *   {{ 'login.title' | t }}
 *   {{ 'workload_list.results' | t : { count: 12 } }}
 *
 * `pure: false` lets the pipe re-run on every change-detection tick so the UI
 * stays reactive when LocaleService.locale() flips. With OnPush components +
 * signals, re-evaluation is cheap.
 */
@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(key: string, params?: Record<string, string | number>): string {
    // Read the locale signal so consumers track it for reactive change detection.
    this.locale.locale();
    return this.locale.t(key, params);
  }
}
