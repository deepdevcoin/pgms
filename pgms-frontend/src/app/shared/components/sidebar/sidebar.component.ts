import { Component, Input } from '@angular/core';

import { NavigationItem } from '../../../core/models/navigation.model';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: false
})
export class SidebarComponent {
  @Input() items: NavigationItem[] = [];
}
