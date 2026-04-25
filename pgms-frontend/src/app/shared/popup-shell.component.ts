import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-popup-shell',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (open) {
      <div class="overlay" (click)="closed.emit()"></div>
      <section class="panel card" role="dialog" aria-modal="true">
        <header class="panel-head">
          <div>
            <div class="eyebrow" *ngIf="eyebrow">{{ eyebrow }}</div>
            <h3>{{ title }}</h3>
            <p class="sub" *ngIf="subtitle">{{ subtitle }}</p>
          </div>
          <button class="icon-btn" type="button" (click)="closed.emit()" aria-label="Close">
            <mat-icon>close</mat-icon>
          </button>
        </header>
        <div class="panel-body">
          <ng-content />
        </div>
      </section>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(3,6,15,0.58); z-index: 70; }
    .panel { position: fixed; inset: 50% auto auto 50%; transform: translate(-50%, -50%); width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 48px); overflow: auto; z-index: 71; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .panel-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .eyebrow { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h3 { margin: 6px 0 2px; font-size: 22px; letter-spacing: -0.02em; }
    .sub { margin: 0; color: var(--text-muted); font-size: 13px; }
    .icon-btn { background: transparent; border: 1px solid var(--border); color: var(--text-muted); border-radius: 10px; width: 36px; height: 36px; display: grid; place-items: center; cursor: pointer; }
    .icon-btn:hover { border-color: var(--primary); color: var(--primary); }
    .panel-body { display: flex; flex-direction: column; gap: 14px; }
  `]
})
export class PopupShellComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() eyebrow = '';
  @Output() closed = new EventEmitter<void>();
}
