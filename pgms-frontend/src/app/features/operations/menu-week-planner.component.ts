import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MenuItem, PG } from '../../core/models';
import { MenuBoardComponent } from '../../shared/menu-board.component';

type MealKey = 'BREAKFAST' | 'LUNCH' | 'DINNER';

interface MealDraft {
  itemNames: string;
  isVeg: boolean;
}

interface DayDraft {
  dayOfWeek: string;
  shortLabel: string;
  label: string;
  meals: Record<MealKey, MealDraft>;
}

@Component({
  selector: 'app-menu-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MenuBoardComponent],
  template: `
    <section class="planner">
      <div class="planner-bar">
        <div>
          <div class="crumb">Meals</div>
          <h2>Weekly planner</h2>
          <p class="sub">Edit one day at a time, keep the week readable, then save the full plan together.</p>
        </div>
        <div class="planner-controls">
          <label class="fld">
            <span>PG</span>
            <select [ngModel]="pgId" (ngModelChange)="pgIdChange.emit($event)">
              @for (pg of pgs; track pg.id) {
                <option [ngValue]="pg.id">{{ pg.name }}</option>
              }
            </select>
          </label>
          <label class="fld">
            <span>Week</span>
            <input type="week" [ngModel]="weekLabel" (ngModelChange)="weekLabelChange.emit($event)" />
          </label>
          <div class="planner-actions">
            <button class="btn btn--ghost" type="button" (click)="loadWeek.emit()">
              <mat-icon>download</mat-icon>
              <span>Load week</span>
            </button>
            <button class="btn btn--primary" type="button" (click)="save()" [disabled]="saving">
              <mat-icon>save</mat-icon>
              <span>{{ saving ? 'Saving...' : 'Save week' }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="summary-grid">
        <article class="summary-card">
          <span class="summary-label">Week coverage</span>
          <strong class="summary-value">{{ filledMealCount() }}/21</strong>
          <span class="summary-meta">{{ filledDayCount() }}/7 days planned</span>
        </article>
        <article class="summary-card">
          <span class="summary-label">Selected day</span>
          <strong class="summary-value">{{ activeDraft().label }}</strong>
          <span class="summary-meta">{{ activeDayCount() }}/3 meals filled</span>
        </article>
        <article class="summary-card">
          <span class="summary-label">Style</span>
          <strong class="summary-value">{{ vegMealCount() }}</strong>
          <span class="summary-meta">veg meals in this week</span>
        </article>
      </div>

      <div class="day-strip">
        @for (day of drafts; track day.dayOfWeek) {
          <button
            type="button"
            class="day-pill"
            [class.day-pill--active]="day.dayOfWeek === activeDay"
            (click)="activeDay = day.dayOfWeek"
          >
            <span class="day-pill__name">{{ day.shortLabel }}</span>
            <span class="day-pill__count">{{ countMeals(day) }}/3</span>
          </button>
        }
      </div>

      <div class="editor-shell">
        <aside class="editor-aside">
          <div class="editor-aside__head">
            <div class="crumb">Editing</div>
            <h3>{{ activeDraft().label }}</h3>
            <p>Keep each meal simple and readable. One line is enough when the plan is straightforward.</p>
          </div>

          <div class="editor-tools">
            <button class="btn btn--ghost btn--full" type="button" (click)="copyPreviousDay()" [disabled]="!hasPreviousDay()">
              <mat-icon>content_copy</mat-icon>
              <span>Copy previous day</span>
            </button>
            <button class="btn btn--ghost btn--full" type="button" (click)="applyActiveToWeekdays()" [disabled]="!hasAnyMeals(activeDraft())">
              <mat-icon>calendar_view_week</mat-icon>
              <span>Apply to weekdays</span>
            </button>
            <button class="btn btn--ghost btn--full" type="button" (click)="clearActiveDay()" [disabled]="!hasAnyMeals(activeDraft())">
              <mat-icon>delete_sweep</mat-icon>
              <span>Clear this day</span>
            </button>
          </div>

          <div class="editor-note">
            <span class="editor-note__label">Quick tip</span>
            <p>Use commas for short menus. Use a second line only when the meal needs a note or a special item.</p>
          </div>
        </aside>

        <div class="meal-editor">
          @for (meal of mealOrder; track meal) {
            <section class="meal-card">
              <div class="meal-card__head">
                <div>
                  <span class="meal-card__label">{{ mealLabel(meal) }}</span>
                  <p>{{ mealHint(meal) }}</p>
                </div>
                <label class="veg-switch">
                  <input type="checkbox" [(ngModel)]="activeDraft().meals[meal].isVeg" [name]="activeDraft().dayOfWeek + '-' + meal + '-veg'" />
                  <span>{{ activeDraft().meals[meal].isVeg ? 'Veg' : 'Mixed' }}</span>
                </label>
              </div>

              <textarea
                [(ngModel)]="activeDraft().meals[meal].itemNames"
                [name]="activeDraft().dayOfWeek + '-' + meal + '-items'"
                [placeholder]="mealPlaceholder(meal)"
              ></textarea>
            </section>
          }
        </div>
      </div>

      <div class="preview-head">
        <div>
          <div class="crumb">Preview</div>
          <h3>Weekly board</h3>
        </div>
      </div>
      <app-menu-board [items]="previewItems()" mode="week" [showWeekLabel]="true" emptyLabel="Add meals to preview the week." />
    </section>
  `,
  styles: [`
    .planner { display: flex; flex-direction: column; gap: 18px; }
    .planner-bar { display: flex; justify-content: space-between; gap: 18px; align-items: end; flex-wrap: wrap; }
    .crumb { font-size: 11px; color: var(--primary); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h2, h3 { margin: 6px 0 2px; letter-spacing: -0.02em; }
    h2 { font-size: 24px; }
    h3 { font-size: 20px; }
    .sub { color: var(--text-muted); font-size: 13px; margin: 0; max-width: 560px; }
    .planner-controls { display: flex; gap: 12px; align-items: end; flex-wrap: wrap; }
    .fld { display: grid; gap: 6px; min-width: 170px; }
    .fld span { font-size: 11px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; }
    .fld input, .fld select {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 10px;
      padding: 10px 12px;
      font-family: inherit;
    }
    .planner-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .summary-card {
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: rgba(255,255,255,0.03);
      display: grid;
      gap: 4px;
    }
    .summary-label {
      color: var(--text-muted);
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .summary-value { font-size: 24px; font-weight: 800; }
    .summary-meta { color: var(--text-muted); font-size: 12px; }
    .day-strip {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 10px;
    }
    .day-pill {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: rgba(255,255,255,0.02);
      color: var(--text);
      padding: 12px;
      display: grid;
      gap: 4px;
      text-align: left;
      min-height: 74px;
    }
    .day-pill--active {
      border-color: rgba(96,165,250,0.45);
      background: linear-gradient(180deg, rgba(96,165,250,0.12), rgba(96,165,250,0.03));
      box-shadow: inset 0 0 0 1px rgba(96,165,250,0.16);
    }
    .day-pill__name { font-weight: 700; }
    .day-pill__count { color: var(--text-muted); font-size: 12px; }
    .editor-shell {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      gap: 14px;
      align-items: start;
    }
    .editor-aside,
    .meal-card {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: rgba(255,255,255,0.03);
    }
    .editor-aside {
      padding: 16px;
      display: grid;
      gap: 16px;
      position: sticky;
      top: 16px;
    }
    .editor-aside__head p,
    .editor-note p,
    .meal-card__head p {
      margin: 0;
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.45;
    }
    .editor-tools {
      display: grid;
      gap: 10px;
    }
    .btn--full {
      width: 100%;
      justify-content: flex-start;
    }
    .editor-note {
      padding: 12px;
      border-radius: 12px;
      background: rgba(255,255,255,0.02);
      border: 1px dashed rgba(255,255,255,0.08);
      display: grid;
      gap: 6px;
    }
    .editor-note__label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .meal-editor {
      display: grid;
      gap: 12px;
    }
    .meal-card {
      padding: 16px;
      display: grid;
      gap: 12px;
    }
    .meal-card__head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
    }
    .meal-card__label {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .meal-card textarea {
      width: 100%;
      min-height: 94px;
      resize: vertical;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 12px;
      padding: 12px 14px;
      font: inherit;
      line-height: 1.5;
    }
    .veg-switch {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
      font-size: 12px;
      white-space: nowrap;
    }
    .preview-head { display: flex; justify-content: space-between; align-items: center; }
    @media (max-width: 1180px) {
      .editor-shell { grid-template-columns: 1fr; }
      .editor-aside { position: static; }
    }
    @media (max-width: 980px) {
      .summary-grid,
      .day-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 680px) {
      .summary-grid,
      .day-strip { grid-template-columns: 1fr; }
      .meal-card__head { grid-template-columns: 1fr; display: grid; }
    }
  `]
})
export class MenuWeekPlannerComponent implements OnChanges {
  @Input() pgs: PG[] = [];
  @Input() pgId = 0;
  @Input() weekLabel = '';
  @Input() items: MenuItem[] = [];
  @Input() saving = false;

  @Output() pgIdChange = new EventEmitter<number>();
  @Output() weekLabelChange = new EventEmitter<string>();
  @Output() loadWeek = new EventEmitter<void>();
  @Output() saveWeek = new EventEmitter<MenuItem[]>();

  readonly mealOrder: MealKey[] = ['BREAKFAST', 'LUNCH', 'DINNER'];
  readonly weekdayKeys = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  drafts: DayDraft[] = [];
  activeDay = 'MONDAY';

  ngOnChanges(_changes: SimpleChanges): void {
    this.drafts = this.buildDrafts(this.items);
    if (!this.drafts.some(day => day.dayOfWeek === this.activeDay)) {
      this.activeDay = this.drafts[0]?.dayOfWeek || 'MONDAY';
    }
  }

  save(): void {
    this.saveWeek.emit(this.previewItems());
  }

  previewItems(): MenuItem[] {
    return this.drafts.flatMap(day =>
      this.mealOrder
        .map(meal => ({ day, meal, draft: day.meals[meal] }))
        .filter(entry => entry.draft.itemNames.trim().length > 0)
        .map(entry => ({
          pgId: this.pgId,
          weekLabel: this.weekLabel,
          dayOfWeek: entry.day.dayOfWeek,
          mealType: entry.meal,
          itemNames: entry.draft.itemNames.trim(),
          isVeg: entry.draft.isVeg
        }))
    );
  }

  activeDraft(): DayDraft {
    return this.drafts.find(day => day.dayOfWeek === this.activeDay) || this.drafts[0] || this.emptyDraft('MONDAY');
  }

  filledMealCount(): number {
    return this.previewItems().length;
  }

  filledDayCount(): number {
    return this.drafts.filter(day => this.hasAnyMeals(day)).length;
  }

  activeDayCount(): number {
    return this.countMeals(this.activeDraft());
  }

  vegMealCount(): number {
    return this.previewItems().filter(item => item.isVeg).length;
  }

  countMeals(day: DayDraft): number {
    return this.mealOrder.filter(meal => day.meals[meal].itemNames.trim().length > 0).length;
  }

  hasAnyMeals(day: DayDraft): boolean {
    return this.countMeals(day) > 0;
  }

  hasPreviousDay(): boolean {
    return this.drafts.findIndex(day => day.dayOfWeek === this.activeDay) > 0;
  }

  copyPreviousDay(): void {
    const index = this.drafts.findIndex(day => day.dayOfWeek === this.activeDay);
    if (index <= 0) return;
    const source = this.drafts[index - 1];
    const target = this.activeDraft();
    this.mealOrder.forEach(meal => {
      target.meals[meal] = { ...source.meals[meal] };
    });
  }

  applyActiveToWeekdays(): void {
    const source = this.activeDraft();
    this.drafts
      .filter(day => this.weekdayKeys.includes(day.dayOfWeek))
      .forEach(day => {
        this.mealOrder.forEach(meal => {
          day.meals[meal] = { ...source.meals[meal] };
        });
      });
  }

  clearActiveDay(): void {
    const target = this.activeDraft();
    this.mealOrder.forEach(meal => {
      target.meals[meal] = { itemNames: '', isVeg: true };
    });
  }

  mealLabel(meal: MealKey): string {
    return meal.charAt(0) + meal.slice(1).toLowerCase();
  }

  mealHint(meal: MealKey): string {
    if (meal === 'BREAKFAST') return 'Keep it quick to scan for the morning rush.';
    if (meal === 'LUNCH') return 'Main meal plus sides works well here.';
    return 'Use dinner for the fuller end-of-day plan.';
  }

  mealPlaceholder(meal: MealKey): string {
    if (meal === 'BREAKFAST') return 'Idli, sambar, chutney';
    if (meal === 'LUNCH') return 'Rice, dal, sabzi';
    return 'Chapati, curry';
  }

  private buildDrafts(items: MenuItem[]): DayDraft[] {
    const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    return dayOrder.map(day => ({
      dayOfWeek: day,
      shortLabel: day.slice(0, 3),
      label: day.charAt(0) + day.slice(1).toLowerCase(),
      meals: {
        BREAKFAST: this.mealDraft(items, day, 'BREAKFAST'),
        LUNCH: this.mealDraft(items, day, 'LUNCH'),
        DINNER: this.mealDraft(items, day, 'DINNER')
      }
    }));
  }

  private mealDraft(items: MenuItem[], dayOfWeek: string, mealType: MealKey): MealDraft {
    const item = items.find(entry => entry.dayOfWeek === dayOfWeek && entry.mealType === mealType);
    return {
      itemNames: item?.itemNames || '',
      isVeg: item?.isVeg ?? true
    };
  }

  private emptyDraft(day: string): DayDraft {
    return {
      dayOfWeek: day,
      shortLabel: day.slice(0, 3),
      label: day.charAt(0) + day.slice(1).toLowerCase(),
      meals: {
        BREAKFAST: { itemNames: '', isVeg: true },
        LUNCH: { itemNames: '', isVeg: true },
        DINNER: { itemNames: '', isVeg: true }
      }
    };
  }
}
