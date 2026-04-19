import { Component } from '@angular/core';

import { NavigationItem } from '../../core/models/navigation.model';

@Component({
  selector: 'app-manager-layout',
  templateUrl: './manager-layout.component.html',
  styleUrls: ['./manager-layout.component.scss'],
  standalone: false
})
export class ManagerLayoutComponent {
  readonly navigationItems: NavigationItem[] = [
    { label: 'Dashboard', route: '/manager/dashboard' },
    { label: 'Rooms', route: '/manager/rooms' },
    { label: 'Tenants', route: '/manager/tenants' },
    { label: 'Complaints', route: '/manager/complaints' }
  ];
}
