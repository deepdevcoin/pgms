import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthShellComponent } from './components/auth-shell.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    component: AuthShellComponent,
    data: {
      title: 'Login',
      description: 'Email/password authentication with JWT session bootstrapping, first-login redirect, and role-aware navigation.'
    }
  },
  {
    path: 'change-password',
    component: AuthShellComponent,
    data: {
      title: 'Change Password',
      description: 'Forced first-login password update flow aligned with the backend /api/auth/change-password contract.'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }
