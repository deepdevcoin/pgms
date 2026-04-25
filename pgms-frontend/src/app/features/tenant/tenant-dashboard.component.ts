import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { RentRecord, Tenant } from '../../core/models';

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
  <section class="fade-up" data-testid="tenant-dashboard">
    <header class="head">
      <div>
        <div class="crumb">Welcome</div>
        <h1>Hey, {{ profile()?.name || 'there' }}</h1>
        <p class="sub">Here's a quick look at your room, rent and credits.</p>
      </div>
    </header>

    <div class="cards">
      <div class="card room-card">
        <div class="eyebrow">My room</div>
        <div class="room-id">#{{ profile()?.roomId }}</div>
        <div class="meta">Joined {{ profile()?.joiningDate }}</div>
        <div class="pill dot pill--occupied">{{ profile()?.status }}</div>
      </div>

      <div class="card wallet">
        <div class="eyebrow">Credit wallet</div>
        <div class="amt">₹{{ (profile()?.creditWalletBalance || 0) | number:'1.0-0' }}</div>
        <div class="meta">Redeemable on next rent payment</div>
      </div>

      <div class="card advance">
        <div class="eyebrow">Advance on file</div>
        <div class="amt">₹{{ (profile()?.advanceAmountPaid || 0) | number:'1.0-0' }}</div>
        <div class="meta">Refundable on 30-day notice</div>
      </div>
    </div>

    <div class="rent card">
      <div class="rent-head">
        <div>
          <div class="eyebrow">Current rent</div>
          <div class="rent-amount">₹{{ (currentRent()?.remainingAmountDue || 0) | number:'1.0-0' }}</div>
          <div class="meta">
            @if (currentRent()) {
              {{ currentRent()?.billingMonth }} · {{ currentRent()?.status }}
            } @else {
              No pending rent right now
            }
          </div>
        </div>
        <a class="btn btn--primary" routerLink="/tenant/payments">
          <mat-icon>payments</mat-icon>
          <span>{{ currentRent() ? 'Pay rent' : 'View payments' }}</span>
        </a>
      </div>
      @if (currentRent()) {
        <div class="rent-grid">
          <div class="rent-stat"><span>Total due</span><strong>₹{{ currentRent()!.totalDue | number:'1.0-0' }}</strong></div>
          <div class="rent-stat"><span>Paid</span><strong>₹{{ currentRent()!.amountPaid | number:'1.0-0' }}</strong></div>
          <div class="rent-stat"><span>Fine</span><strong>₹{{ currentRent()!.fineAccrued | number:'1.0-0' }}</strong></div>
          <div class="rent-stat"><span>Due date</span><strong>{{ currentRent()!.dueDate || 'This cycle' }}</strong></div>
        </div>
      }
    </div>

    <div class="empty-state card">
      <mat-icon>dashboard_customize</mat-icon>
      <div>
        <div class="t">Everything else is one tap away</div>
        <div class="s">Complaints, notices, amenities, services, menu, vacate, and sublets are all available from the tenant sidebar.</div>
      </div>
    </div>
  </section>
  `,
  styles: [`
    section { display: flex; flex-direction: column; gap: 18px; }
    .crumb { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h1 { margin: 6px 0 2px; font-size: 28px; letter-spacing: -0.02em; }
    .sub { color: var(--text-muted); font-size: 13px; margin: 0; }
    .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    @media (max-width: 900px) { .cards { grid-template-columns: 1fr; } }
    .card { padding: 20px; display: flex; flex-direction: column; gap: 8px; position: relative; overflow: hidden; }
    .eyebrow { font-size: 11px; color: var(--text-muted); letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; }
    .room-id { font-size: 40px; font-weight: 800; font-family: var(--font-mono); letter-spacing: -0.02em; color: var(--primary); }
    .amt { font-size: 32px; font-weight: 700; font-family: var(--font-mono); letter-spacing: -0.02em; }
    .wallet .amt { color: var(--status-occupied-text); }
    .advance .amt { color: var(--status-subletting-text); }
    .meta { color: var(--text-muted); font-size: 12px; }
    .rent { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .rent-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
    .rent-amount { font-size: 34px; font-weight: 800; font-family: var(--font-mono); letter-spacing: -0.02em; color: var(--primary); }
    .rent-grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 12px; }
    .rent-stat { padding: 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); display: flex; flex-direction: column; gap: 6px; }
    .rent-stat span { font-size: 11px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; }
    .rent-stat strong { font-size: 18px; }
    @media (max-width: 900px) { .rent-grid { grid-template-columns: repeat(2, 1fr); } }
    .empty-state { flex-direction: row; align-items: center; gap: 18px; padding: 24px; border-style: dashed; }
    .empty-state mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--primary); }
    .t { font-weight: 600; margin-bottom: 2px; }
    .s { color: var(--text-muted); font-size: 13px; }
  `]
})
export class TenantDashboardComponent {
  private api = inject(ApiService);
  profile = signal<Tenant | null>(null);
  currentRent = signal<RentRecord | null>(null);

  constructor() {
    this.api.tenantProfile().subscribe({ next: p => this.profile.set(p) });
    this.api.listPayments().subscribe({
      next: records => {
        const active = [...records].sort((a, b) => String(b.billingMonth).localeCompare(String(a.billingMonth)))
          .find(record => record.remainingAmountDue > 0) || records[0] || null;
        this.currentRent.set(active);
      }
    });
  }
}
