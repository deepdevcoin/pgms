import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'change-password',
    loadComponent: () => import('./features/auth/change-password.component').then(m => m.ChangePasswordComponent),
    canActivate: [authGuard]
  },
  {
    path: 'owner',
    canActivate: [authGuard, roleGuard(['OWNER'])],
    loadComponent: () => import('./layout/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/owner/owner-dashboard.component').then(m => m.OwnerDashboardComponent) },
      { path: 'layout', loadComponent: () => import('./features/layout-viz/layout-viz.component').then(m => m.LayoutVizComponent) },
      { path: 'layout/:pgId', loadComponent: () => import('./features/layout-viz/layout-viz.component').then(m => m.LayoutVizComponent) },
      { path: 'pgs', loadComponent: () => import('./features/owner/pgs-list.component').then(m => m.PgsListComponent) },
      { path: 'managers', loadComponent: () => import('./features/owner/managers.component').then(m => m.ManagersComponent) },
      { path: 'tenants', loadComponent: () => import('./features/manager/tenants.component').then(m => m.TenantsComponent) },
      { path: 'payments', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'payments' } },
      { path: 'complaints', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'complaints' } },
      { path: 'notices', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'notices' } },
      { path: 'menu', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'menu' } }
    ]
  },
  {
    path: 'manager',
    canActivate: [authGuard, roleGuard(['MANAGER'])],
    loadComponent: () => import('./layout/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/manager/manager-ops-dashboard.component').then(m => m.ManagerDashboardComponent) },
      { path: 'layout', loadComponent: () => import('./features/layout-viz/layout-viz.component').then(m => m.LayoutVizComponent) },
      { path: 'layout/:pgId', loadComponent: () => import('./features/layout-viz/layout-viz.component').then(m => m.LayoutVizComponent) },
      { path: 'tenants', loadComponent: () => import('./features/manager/tenants.component').then(m => m.TenantsComponent) },
      { path: 'payments', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'payments' } },
      { path: 'complaints', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'complaints' } },
      { path: 'vacate', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'vacate' } },
      { path: 'notices', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'notices' } },
      { path: 'services', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'services' } },
      { path: 'amenities', loadComponent: () => import('./features/manager/manager-amenities.component').then(m => m.ManagerAmenitiesComponent) },
      { path: 'menu', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'menu' } },
      { path: 'sublets', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'sublets' } }
    ]
  },
  {
    path: 'tenant',
    canActivate: [authGuard, roleGuard(['TENANT'])],
    loadComponent: () => import('./layout/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/tenant/tenant-dashboard.component').then(m => m.TenantDashboardComponent) },
      { path: 'payments', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'payments' } },
      { path: 'complaints', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'complaints' } },
      { path: 'vacate', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'vacate' } },
      { path: 'notices', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'notices' } },
      { path: 'services', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'services' } },
      { path: 'amenities', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'amenities' } },
      { path: 'menu', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'menu' } },
      { path: 'sublets', loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent), data: { module: 'sublets' } }
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
