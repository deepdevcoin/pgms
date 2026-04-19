import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { UserRole } from './core/models/auth.model';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/login'
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.module').then((module) => module.AuthModule)
  },
  {
    path: 'owner',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.OWNER] },
    loadChildren: () =>
      import('./features/owner/owner.module').then((module) => module.OwnerModule)
  },
  {
    path: 'manager',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.MANAGER] },
    loadChildren: () =>
      import('./features/manager/manager.module').then((module) => module.ManagerModule)
  },
  {
    path: 'tenant',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.TENANT] },
    loadChildren: () =>
      import('./features/tenant/tenant.module').then((module) => module.TenantModule)
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'enabled'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
