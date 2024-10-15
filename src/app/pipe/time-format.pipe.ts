import { Pipe, PipeTransform } from '@angular/core';
import { DateTime } from 'luxon';

@Pipe({
  name: 'timeFormatter',
  standalone: true,
})
export class TimeFormatterPipe implements PipeTransform {
  transform(minutes: DateTime | number): string {
    if(typeof(minutes) === 'number') {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    } else {
      return minutes.toFormat('HH:mm dd.MM.yyyy');
    }   
  }
}