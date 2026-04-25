import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MenuItem } from '../core/models';

type MenuMode = 'today' | 'week';

@Component({
  selector: 'app-menu-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (mode() === 'today') {
      <div class="today-menu-grid">
        @for (meal of todayMeals(); track mealKey(meal)) {
          <article class="menu-card">
            <div class="menu-top">
              <strong>{{ meal.mealType }}</strong>
              <span class="food-tag" [class.food-tag--veg]="meal.isVeg">{{ meal.isVeg ? 'Veg' : 'Mixed' }}</span>
            </div>
            <p>{{ meal.itemNames }}</p>
          </article>
        } @empty {
          <div class="empty">{{ emptyLabel() }}</div>
        }
      </div>
    } @else {
      <div class="week-menu-grid">
        @for (day of weeklySections(); track day.day) {
          <article class="menu-day-card" [class.menu-day-card--today]="day.isToday">
            <div class="menu-day-head">
              <div>
                <strong>{{ day.day }}</strong>
                @if (showWeekLabel() && day.weekLabel) {
                  <div class="week-label">{{ day.weekLabel }}</div>
                }
              </div>
              @if (day.isToday) {
                <span class="chip">Today</span>
              }
            </div>

            <div class="meal-stack">
              @for (meal of day.meals; track mealKey(meal)) {
                <div class="meal-row">
                  <div class="meal-copy">
                    <span class="meal-name">{{ meal.mealType }}</span>
                    <p>{{ meal.itemNames }}</p>
                  </div>
                  <span class="food-tag" [class.food-tag--veg]="meal.isVeg">{{ meal.isVeg ? 'Veg' : 'Mixed' }}</span>
                </div>
              }
            </div>
          </article>
        } @empty {
          <div class="empty">{{ emptyLabel() }}</div>
        }
      </div>
    }
  `,
  styles: [`
    .today-menu-grid,
    .week-menu-grid {
      display: grid;
      gap: 12px;
    }

    .today-menu-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .week-menu-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .menu-card,
    .menu-day-card {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: rgba(255,255,255,0.03);
      padding: 16px;
    }

    .menu-card {
      display: grid;
      gap: 10px;
    }

    .menu-card p,
    .meal-copy p {
      margin: 0;
      line-height: 1.45;
      color: var(--text);
    }

    .menu-top,
    .menu-day-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: start;
    }

    .menu-day-card {
      display: grid;
      gap: 12px;
    }

    .menu-day-card--today {
      background:
        linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.025)),
        linear-gradient(135deg, rgba(96,165,250,0.1), transparent 45%);
    }

    .week-label {
      color: var(--text-muted);
      font-size: 12px;
      margin-top: 2px;
    }

    .meal-stack {
      display: grid;
      gap: 10px;
    }

    .meal-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
      padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }

    .meal-row:first-child {
      padding-top: 0;
      border-top: 0;
    }

    .meal-copy {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .meal-name {
      font-size: 11px;
      color: var(--text-muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .food-tag,
    .chip {
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      background: rgba(255,255,255,0.06);
      color: var(--text-muted);
    }

    .food-tag--veg {
      background: rgba(34,197,94,0.12);
      color: #86efac;
    }

    .empty {
      grid-column: 1 / -1;
      padding: 18px;
      border: 1px dashed var(--border);
      border-radius: 14px;
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
    }

    @media (max-width: 980px) {
      .today-menu-grid,
      .week-menu-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .meal-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MenuBoardComponent {
  items = input<MenuItem[]>([]);
  mode = input<MenuMode>('week');
  emptyLabel = input('Menu is not available right now.');
  showWeekLabel = input(false);

  private readonly dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  private readonly mealOrder: Record<string, number> = { BREAKFAST: 0, LUNCH: 1, DINNER: 2 };

  todayMeals = computed(() => {
    const today = this.dayName();
    return this.items()
      .filter(item => item.dayOfWeek === today)
      .sort((a, b) => (this.mealOrder[a.mealType] ?? 9) - (this.mealOrder[b.mealType] ?? 9));
  });

  weeklySections = computed(() => {
    const today = this.dayName();
    const items = this.items();

    return this.dayOrder
      .map(day => ({
        day,
        isToday: day === today,
        weekLabel: items.find(item => item.dayOfWeek === day)?.weekLabel || '',
        meals: items
          .filter(item => item.dayOfWeek === day)
          .sort((a, b) => (this.mealOrder[a.mealType] ?? 9) - (this.mealOrder[b.mealType] ?? 9))
      }))
      .filter(day => day.meals.length > 0);
  });

  mealKey(item: MenuItem): string {
    return String(item.id || `${item.dayOfWeek}-${item.mealType}-${item.itemNames}`);
  }

  private dayName(): string {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()).toUpperCase();
  }
}
