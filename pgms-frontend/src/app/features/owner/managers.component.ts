import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';
import { Manager } from '../../core/models';

@Component({
    selector: 'app-managers',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    template: `
  <section class="fade-up">
    <header class="head">
      <div>
        <div class="crumb">Team</div>
        <h1>Managers</h1>
        <p class="sub">People running day-to-day operations across properties.</p>
      </div>
    </header>

    <div class="list" data-testid="managers-list">
      @for (m of managers(); track m.id) {
        <div class="row" [attr.data-testid]="'manager-row-' + m.id">
          <div class="avatar" [style.background]="color(m.name)">{{ initials(m.name) }}</div>
          <div class="info">
            <div class="name">{{ m.name }} <span class="pill dot pill--occupied" *ngIf="m.isActive">Active</span></div>
            <div class="meta">{{ m.designation }} · {{ m.email }} · {{ m.phone }}</div>
          </div>
          <div class="assigned">
            <div class="lbl">Assigned PGs</div>
            <div class="chips">
              @for (pg of m.assignedPgs; track pg.id) {
                <span class="chip"><mat-icon>domain</mat-icon>{{ pg.name }}</span>
              }
            </div>
          </div>
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
    .list { display: flex; flex-direction: column; gap: 12px; }
    .row { display: grid; grid-template-columns: 52px 1fr auto; gap: 16px; align-items: center; padding: 16px 18px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; }
    .avatar { width: 44px; height: 44px; border-radius: 12px; color: white; font-weight: 700; display: grid; place-items: center; }
    .name { font-weight: 600; font-size: 15px; display: flex; gap: 10px; align-items: center; }
    .meta { color: var(--text-muted); font-size: 12px; margin-top: 4px; }
    .assigned { text-align: right; }
    .lbl { font-size: 10px; letter-spacing: 0.12em; color: var(--text-dim); text-transform: uppercase; margin-bottom: 6px; }
    .chips { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
    .chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 4px 8px; border-radius: 8px; background: var(--bg-elev); border: 1px solid var(--border); color: var(--text-muted); }
    .chip mat-icon { font-size: 12px; width: 12px; height: 12px; color: var(--primary); }
  `]
})
export class ManagersComponent {
    private api = inject(ApiService);
    managers = signal<Manager[]>([]);
    constructor() { this.api.listManagers().subscribe({ next: (m) => this.managers.set(m) }); }
    initials(n: string) { return n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(); }
    color(n: string) {
        const colors = ['linear-gradient(135deg,#818cf8,#6366f1)', 'linear-gradient(135deg,#34d399,#10b981)', 'linear-gradient(135deg,#f472b6,#db2777)', 'linear-gradient(135deg,#a78bfa,#7c3aed)'];
        let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
        return colors[h % colors.length];
    }
}