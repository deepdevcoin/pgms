import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule],
    template: `
  <div class="wrap bg-grid">
    <div class="pane left">
      <div class="brand">
        <div class="mark"><mat-icon>apartment</mat-icon></div>
        <div>
          <div class="t">PGMS</div>
          <div class="s">Property Intelligence</div>
        </div>
      </div>

      <div class="hero">
        <h1>See your building. <br/><span>Not a spreadsheet.</span></h1>
        <p>Walk through floors visually. Spot vacancies in a glance. Act on what matters in seconds.</p>

        <div class="legend">
          <div class="lg-item"><span class="dot vacant"></span>Vacant</div>
          <div class="lg-item"><span class="dot occupied"></span>Occupied</div>
          <div class="lg-item"><span class="dot vacating"></span>Vacating</div>
          <div class="lg-item"><span class="dot subletting"></span>Subletting</div>
        </div>
      </div>

      <div class="mini-building fade-up" aria-hidden="true">
        @for (f of floors; track f) {
          <div class="floor">
            @for (s of rowStates(f); track $index) {
              <div class="cell" [class]="'c-' + s"></div>
            }
          </div>
        }
      </div>
    </div>

    <div class="pane right">
      <form class="form card" (ngSubmit)="submit()" #f="ngForm">
        <div class="head">
          <div class="eyebrow">Welcome back</div>
          <h2>Sign in to PGMS</h2>
          <p>Access your owner, manager or tenant workspace.</p>
        </div>

        <label class="fld">
          <span>Email</span>
          <input type="email" name="email" [(ngModel)]="email" required
                 placeholder="you@pgms.in" data-testid="login-email" autocomplete="email"/>
        </label>

        <label class="fld">
          <span>Password</span>
          <input type="password" name="password" [(ngModel)]="password" required
                 placeholder="••••••••" data-testid="login-password" autocomplete="current-password"/>
        </label>

        <div class="row">
          <label class="demo">
            <input type="checkbox" [(ngModel)]="demo" name="demo" data-testid="login-demo-toggle"/>
            <span>Demo mode <em>(uses seeded data)</em></span>
          </label>
          <span class="kbd">Enter ↵</span>
        </div>

        <button class="btn btn--primary full" type="submit" [disabled]="loading()" data-testid="login-submit">
          {{ loading() ? 'Signing you in…' : 'Continue' }}
        </button>

        <div class="api-config" *ngIf="!demo">
          <label class="fld">
            <span>API base URL</span>
            <input type="text" name="api" [(ngModel)]="apiBase"
                   placeholder="http://localhost:8080/api" data-testid="login-api-base"/>
          </label>
        </div>

        <div class="demo-hint" *ngIf="demo" data-testid="login-demo-hint">
          <mat-icon>auto_awesome</mat-icon>
          <div>
            <strong>Demo credentials</strong>
            <div>Any password works. Use email containing:</div>
            <ul>
              <li><code>owner&#64;pgms.in</code> → Owner console</li>
              <li><code>manager&#64;pgms.in</code> → Manager console</li>
              <li><code>tenant&#64;pgms.in</code> → Tenant portal</li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  </div>
  `,
    styles: [`
    :host { display: block; min-height: 100vh; }
    .wrap { display: grid; grid-template-columns: 1.1fr 1fr; min-height: 100vh; }
    @media (max-width: 960px) { .wrap { grid-template-columns: 1fr; } .left { display: none; } }
    .pane { padding: 48px 56px; display: flex; flex-direction: column; gap: 32px; }
    .left { background: radial-gradient(1200px 500px at -10% -20%, rgba(52,211,153,0.12), transparent), #0b0f1a; border-right: 1px solid var(--border); position: relative; overflow: hidden; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .mark { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg,#34d399,#10b981); color: #052e26; display: grid; place-items: center; }
    .t { font-weight: 800; font-size: 20px; }
    .s { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-muted); }
    .hero h1 { font-size: 44px; line-height: 1.08; margin: 0 0 16px; letter-spacing: -0.02em; }
    .hero h1 span { background: linear-gradient(90deg, #34d399, #a78bfa); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .hero p { color: var(--text-muted); font-size: 15px; max-width: 480px; line-height: 1.6; }
    .legend { display: flex; gap: 18px; margin-top: 24px; flex-wrap: wrap; }
    .lg-item { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); letter-spacing: 0.04em; }
    .dot { width: 10px; height: 10px; border-radius: 3px; }
    .dot.vacant { background: var(--status-vacant-text); }
    .dot.occupied { background: var(--status-occupied-text); }
    .dot.vacating { background: var(--status-vacating-text); }
    .dot.subletting { background: var(--status-subletting-text); }
    .mini-building { position: absolute; bottom: 48px; right: -40px; display: flex; flex-direction: column; gap: 6px; opacity: 0.85; transform: perspective(800px) rotateX(28deg) rotateZ(-8deg); transform-origin: bottom right; }
    .mini-building .floor { display: flex; gap: 6px; }
    .mini-building .cell { width: 28px; height: 22px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.08); }
    .c-vacant { background: var(--status-vacant-bg); border-color: var(--status-vacant-border); }
    .c-occupied { background: var(--status-occupied-bg); border-color: var(--status-occupied-border); }
    .c-vacating { background: var(--status-vacating-bg); border-color: var(--status-vacating-border); }
    .c-subletting { background: var(--status-subletting-bg); border-color: var(--status-subletting-border); }

    .right { display: grid; place-items: center; background: var(--bg); }
    .form { width: 100%; max-width: 420px; padding: 32px; display: flex; flex-direction: column; gap: 16px; }
    .eyebrow { font-size: 11px; letter-spacing: 0.16em; color: var(--primary); text-transform: uppercase; font-weight: 700; }
    .head h2 { margin: 6px 0 4px; font-size: 26px; letter-spacing: -0.01em; }
    .head p { margin: 0; color: var(--text-muted); font-size: 13px; }
    .fld { display: flex; flex-direction: column; gap: 6px; }
    .fld span { font-size: 12px; color: var(--text-muted); font-weight: 500; }
    .fld input { background: var(--bg-elev); border: 1px solid var(--border); color: var(--text); font-family: inherit; font-size: 14px; padding: 12px 14px; border-radius: 10px; outline: none; transition: border-color 140ms ease, box-shadow 140ms ease; }
    .fld input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(52,211,153,0.12); }
    .row { display: flex; align-items: center; justify-content: space-between; }
    .demo { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); cursor: pointer; }
    .demo em { color: var(--text-dim); font-style: normal; }
    .full { width: 100%; padding: 12px; font-size: 14px; }
    .demo-hint { display: flex; gap: 12px; padding: 14px; border: 1px dashed var(--border); border-radius: 12px; font-size: 12px; color: var(--text-muted); background: rgba(129,140,248,0.04); }
    .demo-hint mat-icon { color: var(--accent); flex-shrink: 0; }
    .demo-hint strong { color: var(--text); display: block; margin-bottom: 4px; }
    .demo-hint ul { margin: 6px 0 0; padding-left: 18px; }
    .demo-hint code { font-family: var(--font-mono); font-size: 11px; color: var(--primary); }
    .api-config { margin-top: 2px; }
  `]
})
export class LoginComponent {
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private router = inject(Router);
    private snack = inject(MatSnackBar);

    email = '';
    password = '';
    demo = this.auth.demoMode;
    apiBase = this.auth.apiBase;
    loading = signal(false);

    floors = [0, 1, 2, 3, 4];
    private stateOrder = ['occupied', 'occupied', 'vacant', 'occupied', 'vacating', 'occupied', 'subletting', 'occupied', 'vacant'];
    rowStates(f: number): string[] {
        return Array.from({ length: 9 }, (_, i) => this.stateOrder[(i + f * 2) % this.stateOrder.length]);
    }

    submit() {
        if (!this.email || !this.password) return;
        this.auth.demoMode = this.demo;
        if (!this.demo) this.auth.apiBase = this.apiBase;
        this.loading.set(true);
        this.api.login(this.email, this.password).subscribe({
            next: (resp) => {
                this.auth.setSession(resp);
                if (resp.isFirstLogin) { this.router.navigateByUrl('/change-password'); return; }
                this.router.navigateByUrl(this.auth.homeRouteFor(resp.role));
            },
            error: (e) => {
                this.loading.set(false);
                this.snack.open(e?.error?.message || e?.message || 'Login failed', 'Dismiss', { duration: 3500, panelClass: 'pgms-snack' });
            }
        });
    }
}
