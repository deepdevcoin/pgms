import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ManagerLayoutComponent } from '../../layouts/manager-layout/manager-layout.component';
import { ManagerSectionComponent } from './components/manager-section.component';

const routes: Routes = [
  {
    path: '',
    component: ManagerLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        component: ManagerSectionComponent,
        data: {
          title: 'Manager Dashboard',
          description: 'Assigned PG occupancy, rent tracking, complaints, and action queues.'
        }
      },
      {
        path: 'rooms',
        component: ManagerSectionComponent,
        data: {
          title: 'Rooms Management',
          description: 'Room inventory maintenance with update controls for rent, sharing type, AC status, and occupancy.'
        }
      },
      {
        path: 'tenants',
        component: ManagerSectionComponent,
        data: {
          title: 'Tenants Management',
          description: 'Tenant onboarding, profile list, and room allocation workflows for assigned PGs.'
        }
      },
      {
        path: 'complaints',
        component: ManagerSectionComponent,
        data: {
          title: 'Complaints Dashboard',
          description: 'Complaint triage, SLA tracking, and resolution updates for manager-scoped issues.'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManagerRoutingModule { }
