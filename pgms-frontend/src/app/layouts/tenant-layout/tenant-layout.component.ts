import { Component } from '@angular/core';

import { NavigationItem } from '../../core/models/navigation.model';

@Component({
  selector: 'app-tenant-layout',
  templateUrl: './tenant-layout.component.html',
  styleUrls: ['./tenant-layout.component.scss'],
  standalone: false
})
export class TenantLayoutComponent {
  readonly navigationItems: NavigationItem[] = [
    { label: 'Profile', route: '/tenant/profile' },
    { label: 'Payments', route: '/tenant/payments' },
    { label: 'Complaints', route: '/tenant/complaints' },
    { label: 'Amenities', route: '/tenant/amenities' },
    { label: 'Services', route: '/tenant/services' }
  ];
}
