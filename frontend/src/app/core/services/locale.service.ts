import { computed, Injectable, signal } from '@angular/core';

import { TR_DICTIONARY } from '../i18n/tr';
import { EN_DICTIONARY } from '../i18n/en';

export type Locale = 'tr' | 'en';

const STORAGE_KEY = 'workload.locale';
const DEFAULT_LOCALE: Locale = 'tr';

type Dict = Record<string, unknown>;

function isPlainObject(v: unknown): v is Dict {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function lookup(dict: Dict, key: string): string | undefined {
  let cursor: unknown = dict;
  for (const part of key.split('.')) {
    if (!isPlainObject(cursor)) return undefined;
    cursor = (cursor as Dict)[part];
  }
  return typeof cursor === 'string' ? cursor : undefined;
}

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly _locale = signal<Locale>(this.readInitial());

  /** Reactive locale signal — components/pipes that read this re-render on change. */
  readonly locale = this._locale.asReadonly();

  private readonly dicts: Record<Locale, Dict> = {
    tr: TR_DICTIONARY,
    en: EN_DICTIONARY,
  };

  /** Active dictionary, recomputed when locale changes. */
  readonly dict = computed<Dict>(() => this.dicts[this._locale()]);

  setLocale(locale: Locale): void {
    if (locale !== 'tr' && locale !== 'en') return;
    this._locale.set(locale);
    try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* ignore */ }
    document.documentElement.lang = locale;
  }

  toggle(): void {
    this.setLocale(this._locale() === 'tr' ? 'en' : 'tr');
  }

  /** Lookup a translation by dotted key. Falls back to the key itself when missing.
   *  Tracks the locale signal so callers in templates/computeds re-evaluate on switch.
   *  Optional `params` substitute `{name}` placeholders. */
  t(key: string, params?: Record<string, string | number>): string {
    const value = lookup(this.dict(), key) ?? lookup(this.dicts[DEFAULT_LOCALE], key) ?? key;
    if (!params) return value;
    return Object.entries(params).reduce(
      (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
      value,
    );
  }

  private readInitial(): Locale {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'tr' || saved === 'en') return saved;
    } catch { /* ignore */ }
    return DEFAULT_LOCALE;
  }
}
