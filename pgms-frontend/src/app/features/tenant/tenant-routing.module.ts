import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TenantLayoutComponent } from '../../layouts/tenant-layout/tenant-layout.component';
import { TenantSectionComponent } from './components/tenant-section.component';

const routes: Routes = [
  {
    path: '',
    component: TenantLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'profile'
      },
      {
        path: 'profile',
        component: TenantSectionComponent,
        data: {
          title: 'Profile',
          description: 'Tenant identity, room assignment, KYC status, and wallet summary.'
        }
      },
      {
        path: 'payments',
        component: TenantSectionComponent,
        data: {
          title: 'Payments',
          description: 'Current dues, payment history, and credit wallet application against rent.'
        }
      },
      {
        path: 'complaints',
        component: TenantSectionComponent,
        data: {
          title: 'Complaints',
          description: 'Complaint submission, tracking, and escalation visibility for tenants.'
        }
      },
      {
        path: 'amenities',
        component: TenantSectionComponent,
        data: {
          title: 'Amenities',
          description: 'Book washing machines, games, and other shared amenity slots.'
        }
      },
      {
        path: 'services',
        component: TenantSectionComponent,
        data: {
          title: 'Services',
          description: 'Request housekeeping and service bookings, then review completed service quality.'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TenantRoutingModule { }
