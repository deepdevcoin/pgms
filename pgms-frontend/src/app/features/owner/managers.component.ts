import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { Manager, PG } from '../../core/models';
import { PopupShellComponent } from '../../shared/popup-shell.component';

@Component({
  selector: 'app-managers',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PopupShellComponent],
  template: `
  <section class="fade-up managers">
    <header class="head">
      <div>
        <div class="crumb">Team</div>
        <h1>Managers</h1>
        <p class="sub">Create, assign and activate the people running operations.</p>
      </div>
      <button class="btn btn--primary" (click)="showForm.set(!showForm())">
        <mat-icon>{{ showForm() ? 'close' : 'badge' }}</mat-icon><span>{{ showForm() ? 'Close' : 'Create manager' }}</span>
      </button>
    </header>

    @if (showForm()) {
      <form class="form card" (ngSubmit)="createManager()">
        <label class="fld"><span>Name</span><input [(ngModel)]="form.name" name="name" /></label>
        <label class="fld"><span>Email</span><input [(ngModel)]="form.email" name="email" type="email" /></label>
        <label class="fld"><span>Phone</span><input [(ngModel)]="form.phone" name="phone" /></label>
        <label class="fld wide"><span>Assigned PGs</span>
          <select multiple [(ngModel)]="form.pgIds" name="pgIds">
            @for (pg of pgs(); track pg.id) { <option [ngValue]="pg.id">{{ pg.name }}</option> }
          </select>
        </label>
        <button class="btn btn--primary" type="submit" [disabled]="saving()"><mat-icon>check</mat-icon><span>{{ saving() ? 'Saving...' : 'Create' }}</span></button>
      </form>
    }

    <div class="list" data-testid="managers-list">
      @for (m of managers(); track m.id) {
        <div class="row" [attr.data-testid]="'manager-row-' + m.id">
          <div class="avatar" [style.background]="color(m.name)">{{ initials(m.name) }}</div>
          <div class="info">
            <div class="name">
              {{ m.name }}
              <span class="pill dot" [class.pill--occupied]="m.isActive" [class.pill--vacating]="!m.isActive">{{ m.isActive ? 'Active' : 'Inactive' }}</span>
            </div>
            <div class="meta">{{ m.email }} · {{ m.phone }}</div>
          </div>
          <div class="assigned">
            <div class="lbl">Assigned PGs</div>
            <div class="chips">
              @for (pg of m.assignedPgs; track pg.id) {
                <span class="chip"><mat-icon>domain</mat-icon>{{ pg.name }}</span>
              } @empty {
                <span class="chip">None</span>
              }
            </div>
            <div class="tools">
              <button class="mini" (click)="assign(m)"><mat-icon>edit</mat-icon>Assign</button>
              <button class="mini" (click)="toggleActive(m)"><mat-icon>{{ m.isActive ? 'pause_circle' : 'play_circle' }}</mat-icon>{{ m.isActive ? 'Deactivate' : 'Activate' }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  </section>

  <app-popup-shell
    [open]="assignmentOpen()"
    eyebrow="Managers"
    title="Assign PGs"
    subtitle="Choose the properties this manager should handle."
    (closed)="closeAssignment()"
  >
    <div class="assignment-list">
      @for (pg of pgs(); track pg.id) {
        <label class="assignment-option">
          <input type="checkbox" [checked]="selectedPgIds().includes(pg.id)" (change)="togglePg(pg.id, $any($event.target).checked)" />
          <div>
            <div class="assignment-name">{{ pg.name }}</div>
            <div class="assignment-meta">{{ pg.address }}</div>
          </div>
        </label>
      }
    </div>
    <div class="modal-actions">
      <button class="btn btn--ghost" type="button" (click)="closeAssignment()">Cancel</button>
      <button class="btn btn--primary" type="button" (click)="saveAssignment()" [disabled]="savingAssignment()">
        <mat-icon>check</mat-icon>
        <span>{{ savingAssignment() ? 'Saving...' : 'Save assignment' }}</span>
      </button>
    </div>
  </app-popup-shell>
  `,
  styles: [`
    .managers { display: flex; flex-direction: column; gap: 18px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .crumb { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h1 { margin: 6px 0 2px; font-size: 28px; letter-spacing: -0.02em; }
    .sub { color: var(--text-muted); font-size: 13px; margin: 0; }
    .form { display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 12px; padding: 16px; align-items: end; }
    .fld { display: flex; flex-direction: column; gap: 6px; }
    .fld.wide { grid-column: span 3; }
    .fld span { font-size: 11px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; }
    input, select { background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 10px; padding: 10px 12px; font-family: inherit; }
    select[multiple] { min-height: 96px; }
    .list { display: flex; flex-direction: column; gap: 12px; }
    .row { display: grid; grid-template-columns: 52px 1fr minmax(280px, auto); gap: 16px; align-items: center; padding: 16px 18px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; }
    .avatar { width: 44px; height: 44px; border-radius: 12px; color: white; font-weight: 700; display: grid; place-items: center; }
    .name { font-weight: 600; font-size: 15px; display: flex; gap: 10px; align-items: center; }
    .meta { color: var(--text-muted); font-size: 12px; margin-top: 4px; }
    .assigned { text-align: right; display: grid; gap: 8px; }
    .lbl { font-size: 10px; letter-spacing: 0.12em; color: var(--text-dim); text-transform: uppercase; }
    .chips, .tools { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
    .chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 4px 8px; border-radius: 8px; background: var(--bg-elev); border: 1px solid var(--border); color: var(--text-muted); }
    .chip mat-icon { font-size: 12px; width: 12px; height: 12px; color: var(--primary); }
    .mini { display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 11px; color: var(--text-muted); background: transparent; border: 1px solid var(--border); border-radius: 8px; padding: 5px 8px; cursor: pointer; }
    .mini:hover { color: var(--primary); border-color: var(--primary); }
    .mini mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .assignment-list { display: flex; flex-direction: column; gap: 10px; max-height: 340px; overflow: auto; }
    .assignment-option { display: grid; grid-template-columns: 18px 1fr; gap: 12px; align-items: start; padding: 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); cursor: pointer; }
    .assignment-name { font-weight: 600; }
    .assignment-meta { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
    @media (max-width: 980px) { .row, .form { grid-template-columns: 1fr; } .assigned { text-align: left; } .chips, .tools { justify-content: flex-start; } .fld.wide { grid-column: auto; } }
  `]
})
export class ManagersComponent {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  managers = signal<Manager[]>([]);
  pgs = signal<PG[]>([]);
  showForm = signal(false);
  saving = signal(false);
  assignmentOpen = signal(false);
  savingAssignment = signal(false);
  selectedPgIds = signal<number[]>([]);
  form = this.blankForm();
  private selectedManagerId: number | null = null;

  constructor() {
    this.load();
    this.api.listPgs().subscribe({ next: pgs => this.pgs.set(pgs) });
  }

  load() {
    this.api.listManagers().subscribe({ next: managers => this.managers.set(managers) });
  }

  createManager() {
    this.saving.set(true);
    this.api.createManager(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.form = this.blankForm();
        this.snack.open('Manager created. Temporary password is Temp@1234.', 'OK', { duration: 3500, panelClass: 'pgms-snack' });
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.snack.open(err?.message || 'Could not create manager', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' });
      }
    });
  }

  assign(manager: Manager) {
    this.selectedManagerId = manager.id;
    this.selectedPgIds.set(manager.assignedPgs.map(pg => pg.id));
    this.assignmentOpen.set(true);
  }

  toggleActive(manager: Manager) {
    this.api.setManagerActive(manager.id, !manager.isActive).subscribe({
      next: () => { this.snack.open('Manager updated', 'OK', { duration: 2200, panelClass: 'pgms-snack' }); this.load(); },
      error: err => this.snack.open(err?.message || 'Update failed', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' })
    });
  }

  blankForm() { return { name: '', email: '', phone: '', designation: '', pgIds: [] as number[] }; }

  closeAssignment() {
    this.assignmentOpen.set(false);
    this.savingAssignment.set(false);
    this.selectedPgIds.set([]);
    this.selectedManagerId = null;
  }

  togglePg(pgId: number, checked: boolean) {
    const next = new Set(this.selectedPgIds());
    if (checked) next.add(pgId);
    else next.delete(pgId);
    this.selectedPgIds.set([...next]);
  }

  saveAssignment() {
    if (!this.selectedManagerId) return;
    this.savingAssignment.set(true);
    this.api.assignManagerPgs(this.selectedManagerId, this.selectedPgIds()).subscribe({
      next: () => {
        this.snack.open('Assignments updated', 'OK', { duration: 2200, panelClass: 'pgms-snack' });
        this.closeAssignment();
        this.load();
      },
      error: err => {
        this.savingAssignment.set(false);
        this.snack.open(err?.message || 'Assignment failed', 'Dismiss', { duration: 3000, panelClass: 'pgms-snack' });
      }
    });
  }

  initials(n: string) { return n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(); }
  color(n: string) {
    const colors = ['linear-gradient(135deg,#818cf8,#6366f1)', 'linear-gradient(135deg,#34d399,#10b981)', 'linear-gradient(135deg,#f472b6,#db2777)', 'linear-gradient(135deg,#a78bfa,#7c3aed)'];
    let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return colors[h % colors.length];
  }
}
