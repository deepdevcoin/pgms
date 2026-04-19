import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';
import { Tenant } from '../../core/models';

@Component({
    selector: 'app-tenants',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    template: `
  <section class="fade-up">
    <header class="head">
      <div>
        <div class="crumb">People</div>
        <h1>Tenants</h1>
        <p class="sub">{{ tenants().length }} tenants across your assigned PGs.</p>
      </div>
    </header>

    <div class="list" data-testid="tenants-list">
      @for (t of tenants(); track t.userId) {
        <div class="row" [attr.data-testid]="'tenant-row-' + t.userId">
          <div class="avatar" [style.background]="color(t.name)">{{ initials(t.name) }}</div>
          <div class="info">
            <div class="name">{{ t.name }}</div>
            <div class="meta">{{ t.email }} · {{ t.phone }}</div>
          </div>
          <div class="pill dot" [class.pill--occupied]="t.status === 'ACTIVE'" [class.pill--vacating]="t.status === 'VACATING'">{{ t.status }}</div>
        </div>
      }
    </div>
  </section>
  `,
    styles: [`
    .head { margin-bottom: 20px; }
    .crumb { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h1 { margin: 6px 0 2px; font-size: 28px; letter-spacing: -0.02em; }
    .sub { color: var(--text-muted); font-size: 13px; margin: 0; }
    .list { display: flex; flex-direction: column; gap: 10px; }
    .row { display: grid; grid-template-columns: 44px 1fr auto; gap: 14px; align-items: center; padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
    .avatar { width: 40px; height: 40px; border-radius: 10px; color: white; font-weight: 700; display: grid; place-items: center; font-size: 13px; }
    .name { font-weight: 600; font-size: 14px; }
    .meta { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
  `]
})
export class TenantsComponent {
    private api = inject(ApiService);
    tenants = signal<Tenant[]>([]);
    constructor() { this.api.listTenants().subscribe({ next: (t) => this.tenants.set(t) }); }
    initials(n: string) { return n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(); }
    color(n: string) {
        const colors = ['linear-gradient(135deg,#818cf8,#6366f1)', 'linear-gradient(135deg,#34d399,#10b981)', 'linear-gradient(135deg,#f472b6,#db2777)', 'linear-gradient(135deg,#a78bfa,#7c3aed)', 'linear-gradient(135deg,#fbbf24,#d97706)', 'linear-gradient(135deg,#60a5fa,#2563eb)'];
        let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
        return colors[h % colors.length];
    }
}