import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { OwnerLayoutComponent } from '../../layouts/owner-layout/owner-layout.component';
import { OwnerSectionComponent } from './components/owner-section.component';

const routes: Routes = [
  {
    path: '',
    component: OwnerLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        component: OwnerSectionComponent,
        data: {
          title: 'Owner Dashboard',
          description: 'Portfolio analytics, PG overview, complaint visibility, and key operational KPIs.'
        }
      },
      {
        path: 'pgs',
        component: OwnerSectionComponent,
        data: {
          title: 'PG List',
          description: 'Property listing with room counts, vacancy snapshots, and per-PG room drill-down.'
        }
      },
      {
        path: 'managers',
        component: OwnerSectionComponent,
        data: {
          title: 'Managers Management',
          description: 'Create, assign, and deactivate managers with clear ownership of PG properties.'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OwnerRoutingModule { }
