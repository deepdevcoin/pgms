import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../core/auth.service';

interface NavItem { icon: string; label: string; route: string; testId: string; }

@Component({
    selector: 'app-shell',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, MatIconModule, MatTooltipModule],
    template: `
  <div class=\"shell\">
    <aside class=\"rail\" [attr.data-testid]=\"'side-nav'\">
      <div class=\"brand\">
        <div class=\"brand-mark\"><mat-icon>apartment</mat-icon></div>
        <div class=\"brand-txt\">
          <div class=\"brand-title\">StayMate</div>
          <div class=\"brand-sub\">{{ roleLabel() }}</div>
        </div>
      </div>

      <nav class=\"nav\">
        @for (item of navItems(); track item.route) {
          <a [routerLink]=\"item.route\" routerLinkActive=\"active\"
             [attr.data-testid]=\"item.testId\"
             [matTooltip]=\"item.label\" matTooltipPosition=\"right\">
            <mat-icon>{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>

      <div class=\"rail-footer\">
        <div class=\"demo-tag\" *ngIf=\"auth.demoMode\" data-testid=\"demo-badge\">
          <mat-icon>bolt</mat-icon>
          <span>Demo mode</span>
        </div>
        <button class=\"user\" (click)=\"logout()\" data-testid=\"logout-btn\" matTooltip=\"Sign out\" matTooltipPosition=\"right\">
          <div class=\"avatar\">{{ initials() }}</div>
          <div class=\"u-meta\">
            <div class=\"u-name\">{{ auth.user()?.name }}</div>
            <div class=\"u-role\">{{ auth.role() }}</div>
          </div>
          <mat-icon class=\"logout-icon\">logout</mat-icon>
        </button>
      </div>
    </aside>

    <main class=\"main\">
      <router-outlet />
    </main>
  </div>
  `,
    styles: [`
    :host { display: block; height: 100%; }
    .shell { display: grid; grid-template-columns: 256px 1fr; min-height: 100vh; background: var(--bg); }
    .rail {
      background: linear-gradient(180deg, #0d1426 0%, #0b0f1a 100%);
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
      padding: 20px 14px;
      position: sticky; top: 0; height: 100vh;
    }
    .brand { display: flex; align-items: center; gap: 12px; padding: 6px 10px 20px; }
    .brand-mark {
      width: 40px; height: 40px; border-radius: 12px;
      background: linear-gradient(135deg, #34d399, #10b981);
      color: #052e26;
      display: grid; place-items: center;
      box-shadow: 0 6px 24px -8px rgba(52,211,153,0.5);
    }
    .brand-title { font-weight: 800; letter-spacing: 0.02em; font-size: 18px; }
    .brand-sub { font-size: 11px; color: var(--text-muted); letter-spacing: 0.16em; text-transform: uppercase; }
    .nav { display: flex; flex-direction: column; gap: 3px; margin-top: 8px; }
    .nav a {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; border-radius: 10px;
      color: var(--text-muted);
      font-size: 14px; font-weight: 500;
      transition: background 140ms ease, color 140ms ease;
    }
    .nav a mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .nav a:hover { background: rgba(255,255,255,0.04); color: var(--text); }
    .nav a.active {
      background: rgba(52,211,153,0.1);
      color: var(--primary);
      box-shadow: inset 2px 0 0 var(--primary);
    }
    .rail-footer { margin-top: auto; display: flex; flex-direction: column; gap: 10px; }
    .demo-tag {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 10px; border-radius: 8px;
      background: rgba(251,191,36,0.1);
      color: #fcd34d;
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.08em; text-transform: uppercase;
      border: 1px solid rgba(251,191,36,0.3);
      width: fit-content;
    }
    .demo-tag mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .user {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border);
      border-radius: 12px; padding: 8px 10px;
      cursor: pointer; color: var(--text);
      transition: background 140ms ease;
    }
    .user:hover { background: rgba(255,255,255,0.06); }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #818cf8, #6366f1); display: grid; place-items: center; font-weight: 700; font-size: 12px; color: white; }
    .u-meta { flex: 1; text-align: left; overflow: hidden; }
    .u-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .u-role { font-size: 10px; letter-spacing: 0.14em; color: var(--text-dim); text-transform: uppercase; }
    .logout-icon { font-size: 16px; width: 16px; height: 16px; color: var(--text-dim); }
    .main { padding: 24px 32px 48px; overflow-x: hidden; min-width: 0; }
  `]
})
export class AppShellComponent {
    auth = inject(AuthService);
    private router = inject(Router);

    roleLabel = computed(() => {
        const r = this.auth.role();
        return r === 'OWNER' ? 'Owner console' : r === 'MANAGER' ? 'Manager console' : 'Tenant portal';
    });

    initials = computed(() => {
        const n = this.auth.user()?.name || '?';
        return n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    });

    navItems = computed<NavItem[]>(() => {
        const r = this.auth.role();
        if (r === 'OWNER') return [
            { icon: 'space_dashboard', label: 'Overview', route: '/owner/dashboard', testId: 'nav-owner-overview' },
            { icon: 'grid_view', label: 'Layout', route: '/owner/layout', testId: 'nav-owner-layout' },
            { icon: 'domain', label: 'Properties', route: '/owner/pgs', testId: 'nav-owner-pgs' },
            { icon: 'group', label: 'Tenants', route: '/owner/tenants', testId: 'nav-owner-tenants' },
            { icon: 'badge', label: 'Managers', route: '/owner/managers', testId: 'nav-owner-managers' },
            { icon: 'payments', label: 'Payments', route: '/owner/payments', testId: 'nav-owner-payments' },
            { icon: 'report_problem', label: 'Complaints', route: '/owner/complaints', testId: 'nav-owner-complaints' },
            { icon: 'home_repair_service', label: 'Services', route: '/owner/services', testId: 'nav-owner-services' },
            { icon: 'campaign', label: 'Notices', route: '/owner/notices', testId: 'nav-owner-notices' },
            { icon: 'restaurant_menu', label: 'Menu', route: '/owner/menu', testId: 'nav-owner-menu' }
        ];
        if (r === 'MANAGER') return [
            { icon: 'space_dashboard', label: 'Overview', route: '/manager/dashboard', testId: 'nav-manager-overview' },
            { icon: 'grid_view', label: 'Layout', route: '/manager/layout', testId: 'nav-manager-layout' },
            { icon: 'group', label: 'Tenants', route: '/manager/tenants', testId: 'nav-manager-tenants' },
            { icon: 'payments', label: 'Payments', route: '/manager/payments', testId: 'nav-manager-payments' },
            { icon: 'report_problem', label: 'Complaints', route: '/manager/complaints', testId: 'nav-manager-complaints' },
            { icon: 'move_down', label: 'Vacate', route: '/manager/vacate', testId: 'nav-manager-vacate' },
            { icon: 'campaign', label: 'Notices', route: '/manager/notices', testId: 'nav-manager-notices' },
            { icon: 'home_repair_service', label: 'Services', route: '/manager/services', testId: 'nav-manager-services' },
            { icon: 'event_available', label: 'Amenities', route: '/manager/amenities', testId: 'nav-manager-amenities' },
            { icon: 'verified_user', label: 'KYC', route: '/manager/kyc', testId: 'nav-manager-kyc' },
            { icon: 'restaurant_menu', label: 'Menu', route: '/manager/menu', testId: 'nav-manager-menu' },
            { icon: 'sync_alt', label: 'Sublets', route: '/manager/sublets', testId: 'nav-manager-sublets' }
        ];
        return [
            { icon: 'space_dashboard', label: 'Dashboard', route: '/tenant/dashboard', testId: 'nav-tenant-dashboard' },
            { icon: 'payments', label: 'Payments', route: '/tenant/payments', testId: 'nav-tenant-payments' },
            { icon: 'report_problem', label: 'Complaints', route: '/tenant/complaints', testId: 'nav-tenant-complaints' },
            { icon: 'move_down', label: 'Vacate', route: '/tenant/vacate', testId: 'nav-tenant-vacate' },
            { icon: 'campaign', label: 'Notices', route: '/tenant/notices', testId: 'nav-tenant-notices' },
            { icon: 'home_repair_service', label: 'Services', route: '/tenant/services', testId: 'nav-tenant-services' },
            { icon: 'event_available', label: 'Amenities', route: '/tenant/amenities', testId: 'nav-tenant-amenities' },
            { icon: 'verified_user', label: 'KYC', route: '/tenant/kyc', testId: 'nav-tenant-kyc' },
            { icon: 'restaurant_menu', label: 'Menu', route: '/tenant/menu', testId: 'nav-tenant-menu' },
            { icon: 'sync_alt', label: 'Sublets', route: '/tenant/sublets', testId: 'nav-tenant-sublets' }
        ];
    });

    logout() {
        this.auth.logout();
        this.router.navigateByUrl('/login');
    }
}
