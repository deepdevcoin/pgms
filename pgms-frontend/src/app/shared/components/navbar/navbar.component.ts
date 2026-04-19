import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: false
})
export class NavbarComponent {
  @Input() title = 'PG Management System';
  @Input() subtitle = 'Centralized operations for owners, managers, and tenants.';
}
