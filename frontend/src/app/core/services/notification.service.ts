import { Injectable, signal } from '@angular/core';

export interface AppNotification {
  id: number;
  message: string;
  kind: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private idCounter = 0;
  private readonly _items = signal<AppNotification[]>([]);
  readonly items = this._items.asReadonly();

  push(message: string, kind: AppNotification['kind'] = 'info', timeoutMs = 4000): void {
    const id = ++this.idCounter;
    this._items.update((arr) => [...arr, { id, message, kind }]);
    if (timeoutMs > 0) {
      setTimeout(() => this.dismiss(id), timeoutMs);
    }
  }

  error(message: string): void {
    this.push(message, 'error', 5000);
  }

  success(message: string): void {
    this.push(message, 'success', 2500);
  }

  dismiss(id: number): void {
    this._items.update((arr) => arr.filter((n) => n.id !== id));
  }
}
