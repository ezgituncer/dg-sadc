import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { RoleCode } from '../models/role';

export const roleGuard = (...allowed: RoleCode[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
    if (auth.hasRole(...allowed)) return true;
    return router.createUrlTree(['/dashboard']);
  };
};
