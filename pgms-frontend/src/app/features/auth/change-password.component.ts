import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';

@Component({
    selector: 'app-change-password',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
  <div class="wrap">
    <form class="card" (ngSubmit)="submit()">
      <div class="eyebrow">Security</div>
      <h2>Set a new password</h2>
      <p>Your account uses a temporary password. Choose a new one to continue.</p>
      <input type="password" [(ngModel)]="pwd" name="pwd" required placeholder="New password (min 8 chars)" minlength="8" data-testid="cp-new-password" />
      <input type="password" [(ngModel)]="confirm" name="confirm" required placeholder="Confirm password" data-testid="cp-confirm-password" />
      <button class="btn btn--primary" type="submit" [disabled]="loading()" data-testid="cp-submit">{{ loading() ? 'Saving…' : 'Update & continue' }}</button>
    </form>
  </div>
  `,
    styles: [`
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 40px 24px; }
    .card { width: 100%; max-width: 420px; padding: 32px; display: flex; flex-direction: column; gap: 14px; }
    .eyebrow { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h2 { margin: 0; font-size: 24px; }
    p { margin: 0 0 8px; color: var(--text-muted); font-size: 13px; }
    input { background: var(--bg-elev); border: 1px solid var(--border); color: var(--text); font-family: inherit; font-size: 14px; padding: 12px 14px; border-radius: 10px; }
    input:focus { outline: none; border-color: var(--primary); }
  `]
})
export class ChangePasswordComponent {
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private router = inject(Router);
    private snack = inject(MatSnackBar);
    pwd = '';
    confirm = '';
    loading = signal(false);

    submit() {
        if (this.pwd !== this.confirm) { this.snack.open('Passwords do not match', 'OK', { duration: 3000 }); return; }
        const u = this.auth.user();
        if (!u) { this.router.navigateByUrl('/login'); return; }
        this.loading.set(true);
        this.api.changePassword(u.userId, this.pwd).subscribe({
            next: () => {
                this.auth.updateFirstLoginDone();
                this.router.navigateByUrl(this.auth.homeRouteFor(u.role));
            },
            error: () => { this.loading.set(false); this.snack.open('Could not update password', 'Dismiss', { duration: 3000 }); }
        });
    }
}