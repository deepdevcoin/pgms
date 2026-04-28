import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="wrap">
      <form class="card" (ngSubmit)="submit()">
        <div class="eyebrow">Recovery</div>
        <h2>Reset password</h2>
        <p>Enter your account email and set a new password. This updates the password directly for the matching account.</p>

        <label class="fld">
          <span>Email</span>
          <input type="email" [(ngModel)]="email" name="email" required placeholder="you@pgms.in" autocomplete="email" />
        </label>

        <label class="fld">
          <span>New password</span>
          <div class="password-wrap">
            <input [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="pwd" name="pwd" required placeholder="New password" minlength="8" />
            <button class="icon-btn" type="button" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </div>
        </label>

        <label class="fld">
          <span>Confirm password</span>
          <div class="password-wrap">
            <input [type]="showConfirm() ? 'text' : 'password'" [(ngModel)]="confirm" name="confirm" required placeholder="Confirm password" />
            <button class="icon-btn" type="button" (click)="showConfirm.set(!showConfirm())" [attr.aria-label]="showConfirm() ? 'Hide password confirmation' : 'Show password confirmation'">
              <mat-icon>{{ showConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </div>
        </label>

        <button class="btn btn--primary" type="submit" [disabled]="loading()">{{ loading() ? 'Resetting…' : 'Reset password' }}</button>
        <a class="back-link" routerLink="/login">Back to login</a>
      </form>
    </div>
  `,
  styles: [`
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 40px 24px; }
    .card { width: 100%; max-width: 420px; padding: 32px; display: flex; flex-direction: column; gap: 14px; }
    .eyebrow { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h2 { margin: 0; font-size: 24px; }
    p { margin: 0 0 8px; color: var(--text-muted); font-size: 13px; line-height: 1.5; }
    .fld { display: flex; flex-direction: column; gap: 6px; }
    .fld span { font-size: 12px; color: var(--text-muted); font-weight: 500; }
    input { background: var(--bg-elev); border: 1px solid var(--border); color: var(--text); font-family: inherit; font-size: 14px; padding: 12px 14px; border-radius: 10px; }
    input:focus { outline: none; border-color: var(--primary); }
    .password-wrap { position: relative; display: flex; align-items: center; }
    .password-wrap input { width: 100%; padding-right: 46px; }
    .icon-btn {
      position: absolute;
      right: 8px;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 8px;
      display: grid;
      place-items: center;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
    }
    .icon-btn:hover { color: var(--text); background: rgba(255,255,255,0.04); }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .back-link { text-align: center; color: var(--text-muted); text-decoration: none; font-size: 13px; }
    .back-link:hover { color: var(--text); }
  `]
})
export class ForgotPasswordComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  email = '';
  pwd = '';
  confirm = '';
  loading = signal(false);
  showPassword = signal(false);
  showConfirm = signal(false);

  submit() {
    if (!this.email || !this.pwd) return;
    if (this.pwd !== this.confirm) {
      this.snack.open('Passwords do not match', 'OK', { duration: 3000 });
      return;
    }
    this.loading.set(true);
    this.api.resetPassword(this.email, this.pwd).subscribe({
      next: () => {
        this.loading.set(false);
        if (this.auth.demoMode) {
          this.snack.open('Demo mode: password reset simulated', 'OK', { duration: 2500 });
        } else {
          this.snack.open('Password reset successful', 'OK', { duration: 2500 });
        }
        this.router.navigateByUrl('/login');
      },
      error: (e) => {
        this.loading.set(false);
        this.snack.open(e?.error?.message || e?.message || 'Could not reset password', 'Dismiss', { duration: 3500 });
      }
    });
  }
}
