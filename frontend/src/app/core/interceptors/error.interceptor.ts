import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { LocaleService } from '../services/locale.service';
import { NotificationService } from '../services/notification.service';

const ENDPOINTS_HANDLED_LOCALLY = [
  '/auth/login',     // login form shows its own error
  '/auth/me',        // background refresh
];

function isLocallyHandled(url: string): boolean {
  return ENDPOINTS_HANDLED_LOCALLY.some((p) => url.includes(p));
}

function defaultMessageKeyFor(status: number): string {
  if (status === 0) return 'errors.network';
  if (status === 401) return 'errors.unauthorized';
  if (status === 403) return 'errors.forbidden';
  if (status === 404) return 'errors.not_found';
  if (status === 409) return 'errors.conflict';
  if (status === 422) return 'errors.validation';
  if (status === 429) return 'errors.rate_limited';
  if (status >= 500) return 'errors.server';
  return 'errors.generic';
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationService);
  const locale = inject(LocaleService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (!isLocallyHandled(req.url)) {
        const detail = err?.error?.detail;
        const message =
          typeof detail === 'string'
            ? detail
            : locale.t(defaultMessageKeyFor(err.status));
        notify.error(message);
      }
      return throwError(() => err);
    }),
  );
};
