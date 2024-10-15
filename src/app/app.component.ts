import { Component, signal } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { TimeRangeSliderComponent } from './time-range-slider/time-range-slider.component';
import { TranslocoModule } from '@ngneat/transloco';
import {
  ExecutigonPlanItem,
  ExecutigonPlanItemTime,
} from './interface/execution-plan';
import { MaterialExampleModule } from '../material.module';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    UpperCasePipe,
    ReactiveFormsModule,
    TimeRangeSliderComponent,
    MaterialExampleModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'multi-slider';
  isChangesMade = signal(false);

  updateOptionTimes(
    option: ExecutigonPlanItem,
    updatedTimes: ExecutigonPlanItemTime[]
  ) {
    option.times = updatedTimes;
  }

  updateChangesMadeValue(option: boolean) {
    this.isChangesMade.set(option);
  }

  weeklyOptionSelected = signal(false);
  weeklyOptions: ExecutigonPlanItem[] = [
    {
      id: 'Monday',
      selected: false,
      times: [{ from: '00:00', until: '23:59' }],
    },
    {
      id: 'Tuesday',
      selected: false,
      times: [{ from: '00:00', until: '23:59' }],
    },
    {
      id: 'Wednesday',
      selected: false,
      times: [{ from: '00:00', until: '23:59' }],
    },
    {
      id: 'Thursday',
      selected: false,
      times: [{ from: '00:00', until: '23:59' }],
    },
    {
      id: 'Friday',
      selected: false,
      times: [{ from: '00:00', until: '23:59' }],
    },
    {
      id: 'Saturday',
      selected: false,
      times: [{ from: '00:00', until: '23:59' }],
    },
    {
      id: 'Sunday',
      selected: false,
      times: [{ from: '00:00', until: '23:59' }],
    },
  ];

  onWeeklyCtrl(event: ExecutigonPlanItem) {
    event.selected = !event.selected;
    this.weeklyOptionSelected.set(
      this.weeklyOptions.some((option) => option.selected)
    );
  }

  saveTimes() {
    //With this I check whether some intervals in times can be merged, and if yes, merge it
    const executionPlan = this.weeklyOptions.map((option) => {
      return {
        id: option.id,
        selected: option.selected,
        times: this.mergeIntervals(option.times),
      };
    });

    console.log('here is your executionPlan', executionPlan);
  }

  mergeIntervals(timeForms: ExecutigonPlanItemTime[]) {
    timeForms = timeForms.sort((a, b) => {
      return a.from.localeCompare(b.from);
    });

    const mergedIntervals: ExecutigonPlanItemTime[] = [];
    let start = '';
    let end = '';

    // Iterate over each interval in the timeForms array
    for (const form of timeForms) {
      const interval = form;

      // If the start time is not set, set it to the 'from' time of the first interval
      if (!start) {
        start = interval.from;
        end = interval.until;
      } else {
        // If the current interval overlaps with the previous one, update the end time
        if (interval.from <= end) {
          end = interval.until > end ? interval.until : end;
        } else {
          // If there is no overlap, push the merged interval to the array and update the start and end times
          mergedIntervals.push({ from: start, until: end });
          start = interval.from;
          end = interval.until;
        }
      }
    }
    mergedIntervals.push({ from: start, until: end });
    return mergedIntervals;
  }
}
