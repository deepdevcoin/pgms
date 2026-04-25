import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-operations-header',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <header class="head">
      <div>
        <div class="crumb">{{ crumb }}</div>
        <h1>{{ title }}</h1>
        <p class="sub">{{ subtitle }}</p>
      </div>
      <button class="btn btn--primary" *ngIf="showToggle" type="button" (click)="toggleCreate.emit()">
        <mat-icon>{{ formOpen ? 'close' : 'add' }}</mat-icon>
        <span>{{ formOpen ? 'Close' : createLabel }}</span>
      </button>
    </header>
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .crumb { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h1 { margin: 6px 0 2px; font-size: 28px; letter-spacing: -0.02em; }
    .sub { color: var(--text-muted); font-size: 13px; margin: 0; }
  `]
})
export class OperationsHeaderComponent {
  @Input() crumb = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() createLabel = '';
  @Input() formOpen = false;
  @Input() showToggle = false;

  @Output() toggleCreate = new EventEmitter<void>();
}
