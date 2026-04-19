import { Component } from '@angular/core';

import { NavigationItem } from '../../core/models/navigation.model';

@Component({
  selector: 'app-owner-layout',
  templateUrl: './owner-layout.component.html',
  styleUrls: ['./owner-layout.component.scss'],
  standalone: false
})
export class OwnerLayoutComponent {
  readonly navigationItems: NavigationItem[] = [
    { label: 'Dashboard', route: '/owner/dashboard' },
    { label: 'PG List', route: '/owner/pgs' },
    { label: 'Managers', route: '/owner/managers' }
  ];
}
