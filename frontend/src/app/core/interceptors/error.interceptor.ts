import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { NotificationService } from '../services/notification.service';

const ENDPOINTS_HANDLED_LOCALLY = [
  '/auth/login',     // login form shows its own error
  '/auth/me',        // background refresh
];

function isLocallyHandled(url: string): boolean {
  return ENDPOINTS_HANDLED_LOCALLY.some((p) => url.includes(p));
}

function defaultMessageFor(status: number): string {
  if (status === 0) return 'Sunucuya ulaşılamıyor (bağlantınızı kontrol edin)';
  if (status === 401) return 'Oturum süreniz doldu, lütfen tekrar giriş yapın';
  if (status === 403) return 'Bu işlem için yetkiniz yok';
  if (status === 404) return 'Kayıt bulunamadı';
  if (status === 409) return 'Çakışma — kayıt zaten var';
  if (status === 422) return 'Form bilgileri geçersiz';
  if (status === 429) return 'Çok fazla istek — birazdan tekrar deneyin';
  if (status >= 500) return 'Sunucu hatası — birazdan tekrar deneyin';
  return 'İşlem sırasında bir hata oluştu';
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (!isLocallyHandled(req.url)) {
        const detail = err?.error?.detail;
        const message = typeof detail === 'string' ? detail : defaultMessageFor(err.status);
        notify.error(message);
      }
      return throwError(() => err);
    }),
  );
};
