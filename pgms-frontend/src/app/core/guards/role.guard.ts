import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { Role } from '../models';

export const roleGuard = (allowed: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.role();
  if (role && allowed.includes(role)) return true;
  if (role) router.navigateByUrl(auth.homeRouteFor(role));
  else router.navigateByUrl('/login');
  return false;
};