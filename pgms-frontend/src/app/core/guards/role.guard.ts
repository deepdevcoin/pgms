import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { UserRole } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, _: RouterStateSnapshot): boolean | UrlTree {
    const roles = route.data['roles'] as UserRole[] | undefined;

    if (!roles?.length || this.authService.hasRole(roles)) {
      return true;
    }

    return this.router.createUrlTree([this.getFallbackRoute()]);
  }

  private getFallbackRoute(): string {
    switch (this.authService.userRole) {
      case UserRole.OWNER:
        return '/owner/dashboard';
      case UserRole.MANAGER:
        return '/manager/dashboard';
      case UserRole.TENANT:
        return '/tenant/profile';
      default:
        return '/auth/login';
    }
  }
}
