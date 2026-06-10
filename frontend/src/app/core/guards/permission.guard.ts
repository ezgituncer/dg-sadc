import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Allow the route only if the user holds ANY of the given permission codes. */
export const permissionGuard = (...codes: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
    if (auth.hasPermission(...codes)) return true;
    return router.createUrlTree(['/dashboard']);
  };
};
