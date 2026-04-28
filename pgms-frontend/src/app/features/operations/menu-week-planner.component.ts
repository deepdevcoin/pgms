import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MenuItem, PG } from '../../core/models';

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
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <section class="editor">
      <header class="editor-head">
        <div>
          <div class="crumb">Meals</div>
          <h2>Menu editor</h2>
          <p class="sub">Set the current menu for this PG. It stays live until the manager updates it again.</p>
        </div>

        <div class="head-actions">
          <label class="fld">
            <span>PG</span>
            <select [ngModel]="pgId" (ngModelChange)="pgIdChange.emit($event)">
              @for (pg of pgs; track pg.id) {
                <option [ngValue]="pg.id">{{ pg.name }}</option>
              }
            </select>
          </label>

          <button class="btn btn--ghost" type="button" (click)="loadWeek.emit()">
            <mat-icon>refresh</mat-icon>
            <span>Reload</span>
          </button>

          <button class="btn btn--primary" type="button" (click)="save()" [disabled]="saving">
            <mat-icon>save</mat-icon>
            <span>{{ saving ? 'Saving...' : 'Save Menu' }}</span>
          </button>
        </div>
      </header>

      <section class="surface day-switcher">
        @for (day of drafts; track day.dayOfWeek) {
          <button
            class="day-tab"
            type="button"
            [class.day-tab--active]="day.dayOfWeek === activeDay"
            (click)="activeDay = day.dayOfWeek"
          >
            <span>{{ day.shortLabel }}</span>
            <small>{{ countMeals(day) }}/3</small>
          </button>
        }
      </section>

      @if (activeDraft(); as day) {
        <section class="workspace">
          <article class="surface day-panel">
            <div class="day-head">
              <div>
                <h3>{{ day.label }}</h3>
                <p>{{ countMeals(day) }}/3 meals filled for this day</p>
              </div>
              <div class="day-actions">
                @if (day.dayOfWeek === 'MONDAY') {
                  <button class="btn btn--ghost" type="button" (click)="fillWeekdaysFromMonday()">
                    <mat-icon>content_copy</mat-icon>
                    <span>Copy to Weekdays</span>
                  </button>
                }
                <button class="btn btn--ghost" type="button" (click)="clearDay(day)">
                  <mat-icon>delete_sweep</mat-icon>
                  <span>Clear Day</span>
                </button>
              </div>
            </div>

            <div class="meal-stack">
              @for (meal of mealOrder; track meal) {
                <section class="meal-block">
                  <div class="meal-top">
                    <div>
                      <strong>{{ mealLabel(meal) }}</strong>
                      <p>{{ mealHint(meal) }}</p>
                    </div>
                    <label class="veg-toggle">
                      <input type="checkbox" [(ngModel)]="day.meals[meal].isVeg" [name]="day.dayOfWeek + '-' + meal + '-veg'" />
                      <span>{{ day.meals[meal].isVeg ? 'Veg' : 'Mixed' }}</span>
                    </label>
                  </div>

                  <textarea
                    [(ngModel)]="day.meals[meal].itemNames"
                    [name]="day.dayOfWeek + '-' + meal + '-items'"
                    [placeholder]="mealPlaceholder(meal)"
                  ></textarea>
                </section>
              }
            </div>
          </article>

          <aside class="surface preview-panel">
            <div class="preview-head">
              <h3>Day preview</h3>
              <p>{{ day.label }}</p>
            </div>

            <div class="preview-list">
              @for (meal of mealOrder; track meal) {
                <div class="preview-row">
                  <div class="preview-copy">
                    <span>{{ mealLabel(meal) }}</span>
                    <strong>{{ day.meals[meal].itemNames || 'Not set yet' }}</strong>
                  </div>
                  <small [class.preview-veg]="day.meals[meal].isVeg">{{ day.meals[meal].isVeg ? 'Veg' : 'Mixed' }}</small>
                </div>
              }
            </div>
          </aside>
        </section>
      }
    </section>
  `,
  styles: [`
    .editor { display: grid; gap: 18px; }
    .surface {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    .editor-head {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: end;
      flex-wrap: wrap;
    }
    .crumb {
      font-size: 11px;
      color: var(--primary);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
    }
    h2 {
      margin: 6px 0 2px;
      font-size: 24px;
      letter-spacing: 0;
    }
    .sub {
      margin: 0;
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.5;
      max-width: 620px;
    }
    .head-actions {
      display: flex;
      gap: 10px;
      align-items: end;
      flex-wrap: wrap;
    }
    .fld {
      display: grid;
      gap: 6px;
      min-width: 220px;
    }
    .fld span,
    .meta-label {
      font-size: 11px;
      color: var(--text-muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .fld select,
    textarea {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 12px;
      font-family: inherit;
    }
    .fld select {
      padding: 11px 12px;
    }
    .day-head p,
    .meal-top p,
    .preview-head p {
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.45;
      margin: 0;
    }
    .day-switcher {
      padding: 8px;
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 8px;
    }
    .day-tab {
      min-height: 58px;
      border: 1px solid transparent;
      background: var(--bg);
      color: var(--text-muted);
      border-radius: 10px;
      display: grid;
      gap: 2px;
      place-items: center;
      cursor: pointer;
      font: inherit;
    }
    .day-tab span {
      font-size: 12px;
      font-weight: 700;
      color: var(--text);
    }
    .day-tab small {
      font-size: 11px;
    }
    .day-tab--active {
      border-color: rgba(99,102,241,0.32);
      background: rgba(99,102,241,0.1);
    }
    .workspace {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) 320px;
      gap: 14px;
    }
    .day-panel,
    .preview-panel {
      padding: 16px;
    }
    .day-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
      margin-bottom: 14px;
    }
    .day-head h3 {
      margin: 0 0 4px;
      font-size: 18px;
      letter-spacing: 0;
    }
    .day-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .meal-stack {
      display: grid;
      gap: 12px;
    }
    .meal-block {
      display: grid;
      gap: 8px;
      padding: 12px;
      border-radius: 10px;
      background: var(--bg);
      border: 1px solid rgba(255,255,255,0.04);
    }
    .meal-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: start;
    }
    .meal-top strong {
      font-size: 13px;
    }
    .veg-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
      font-size: 12px;
      white-space: nowrap;
    }
    textarea {
      min-height: 78px;
      padding: 12px 14px;
      resize: vertical;
      line-height: 1.5;
    }
    .preview-panel {
      display: grid;
      gap: 14px;
      align-self: start;
    }
    .preview-head h3 {
      margin: 0 0 4px;
      font-size: 18px;
    }
    .preview-list {
      display: grid;
      gap: 10px;
    }
    .preview-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
      padding: 12px;
      border-radius: 10px;
      background: var(--bg);
      border: 1px solid rgba(255,255,255,0.04);
    }
    .preview-copy {
      display: grid;
      gap: 4px;
      min-width: 0;
    }
    .preview-copy span {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }
    .preview-copy strong {
      font-size: 13px;
      line-height: 1.45;
      font-weight: 600;
    }
    .preview-row small {
      color: var(--text-muted);
      font-size: 12px;
      white-space: nowrap;
    }
    .preview-row small.preview-veg {
      color: #86efac;
    }
    @media (max-width: 1100px) {
      .workspace {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 720px) {
      .day-switcher {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .head-actions {
        width: 100%;
      }
      .fld {
        min-width: 100%;
      }
      .meal-top {
        align-items: start;
        flex-direction: column;
      }
    }
    @media (max-width: 560px) {
      .day-switcher {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
  `]
})
export class MenuWeekPlannerComponent implements OnChanges {
  @Input() pgs: PG[] = [];
  @Input() pgId = 0;
  @Input() items: MenuItem[] = [];
  @Input() saving = false;

  @Output() pgIdChange = new EventEmitter<number>();
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
          dayOfWeek: entry.day.dayOfWeek,
          mealType: entry.meal,
          itemNames: entry.draft.itemNames.trim(),
          isVeg: entry.draft.isVeg
        }))
    );
  }

  fillWeekdaysFromMonday(): void {
    const monday = this.drafts.find(day => day.dayOfWeek === 'MONDAY');
    if (!monday) return;
    this.drafts
      .filter(day => this.weekdayKeys.includes(day.dayOfWeek) && day.dayOfWeek !== 'MONDAY')
      .forEach(day => {
        this.mealOrder.forEach(meal => {
          day.meals[meal] = { ...monday.meals[meal] };
        });
      });
  }

  clearDay(day: DayDraft): void {
    this.mealOrder.forEach(meal => {
      day.meals[meal] = { itemNames: '', isVeg: true };
    });
  }

  activeDraft(): DayDraft | null {
    return this.drafts.find(day => day.dayOfWeek === this.activeDay) || this.drafts[0] || null;
  }

  countMeals(day: DayDraft): number {
    return this.mealOrder.filter(meal => day.meals[meal].itemNames.trim().length > 0).length;
  }

  filledDayCount(): number {
    return this.drafts.filter(day => this.countMeals(day) > 0).length;
  }

  filledMealCount(): number {
    return this.previewItems().length;
  }

  vegMealCount(): number {
    return this.previewItems().filter(item => item.isVeg).length;
  }

  mealLabel(meal: MealKey): string {
    return meal.charAt(0) + meal.slice(1).toLowerCase();
  }

  mealHint(meal: MealKey): string {
    if (meal === 'BREAKFAST') return 'Keep it quick and easy to scan.';
    if (meal === 'LUNCH') return 'Main lunch items and sides.';
    return 'Dinner plan for the day.';
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
}
