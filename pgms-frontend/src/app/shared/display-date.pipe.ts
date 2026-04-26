import { Pipe, PipeTransform } from '@angular/core';
import { formatDisplayDate, formatDisplayDateTime } from './date-utils';

@Pipe({
  name: 'displayDate',
  standalone: true
})
export class DisplayDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, mode: 'date' | 'datetime' = 'date'): string {
    return mode === 'datetime' ? formatDisplayDateTime(value) : formatDisplayDate(value);
  }
}
