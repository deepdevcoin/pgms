import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';
import { PG } from '../../core/models';

@Component({
    selector: 'app-pgs-list',
    standalone: true,
    imports: [CommonModule, RouterLink, MatIconModule],
    template: `
  <section class="fade-up">
    <header class="head">
      <div>
        <div class="crumb">Properties</div>
        <h1>All PGs</h1>
        <p class="sub">Pick a property to drill into its floor plan.</p>
      </div>
    </header>

    <div class="grid" data-testid="pgs-grid">
      @for (pg of pgs(); track pg.id) {
        <a [routerLink]="['/owner/layout', pg.id]" class="card" [attr.data-testid]="'pg-card-' + pg.id">
          <div class="ribbon"></div>
          <div class="top">
            <div class="icon"><mat-icon>apartment</mat-icon></div>
            <div class="info">
              <div class="name">{{ pg.name }}</div>
              <div class="addr">{{ pg.address }}</div>
            </div>
          </div>
          <div class="rows">
            <div class="r"><span>Floors</span><strong>{{ pg.totalFloors }}</strong></div>
            <div class="r"><span>Total rooms</span><strong>{{ pg.vacantCount + pg.occupiedCount + pg.vacatingCount }}</strong></div>
            <div class="r"><span>Rent deadline</span><strong>Day {{ pg.paymentDeadlineDay }}</strong></div>
            <div class="r"><span>Fine / day</span><strong>₹{{ pg.fineAmountPerDay }}</strong></div>
          </div>
          <div class="pills">
            <span class="pill dot pill--vacant">{{ pg.vacantCount }} vacant</span>
            <span class="pill dot pill--occupied">{{ pg.occupiedCount }} occupied</span>
            <span class="pill dot pill--vacating" *ngIf="pg.vacatingCount">{{ pg.vacatingCount }} vacating</span>
          </div>
          <div class="cta">
            <span>Open layout</span>
            <mat-icon>arrow_forward</mat-icon>
          </div>
        </a>
      }
    </div>
  </section>
  `,
    styles: [`
    .head { margin-bottom: 20px; }
    .crumb { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h1 { margin: 6px 0 2px; font-size: 28px; letter-spacing: -0.02em; }
    .sub { color: var(--text-muted); font-size: 13px; margin: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 14px; position: relative; overflow: hidden; transition: transform 160ms ease, border-color 160ms ease; color: var(--text); }
    .card:hover { transform: translateY(-2px); border-color: var(--primary); }
    .ribbon { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--primary), var(--accent)); }
    .top { display: flex; gap: 12px; align-items: center; }
    .icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(52,211,153,0.1); color: var(--primary); display: grid; place-items: center; }
    .name { font-weight: 700; font-size: 16px; }
    .addr { color: var(--text-muted); font-size: 12px; }
    .rows { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 0; border-top: 1px dashed var(--border); border-bottom: 1px dashed var(--border); }
    .r { display: flex; justify-content: space-between; font-size: 12px; }
    .r span { color: var(--text-muted); }
    .r strong { font-family: var(--font-mono); font-size: 13px; }
    .pills { display: flex; flex-wrap: wrap; gap: 6px; }
    .cta { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--primary); font-weight: 600; margin-top: 4px; }
    .cta mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `]
})
export class PgsListComponent {
    private api = inject(ApiService);
    pgs = signal<PG[]>([]);
    constructor() { this.api.listPgs().subscribe({ next: (p) => this.pgs.set(p) }); }
}