/**
 * Timerange slider for 24-hours day, which is used in reports *
 */

import { NgFor, NgIf } from "@angular/common";
import {
   ChangeDetectionStrategy,
   Component,
   ElementRef,
   EventEmitter,
   Input,
   OnInit,
   Output,
   ViewChild,
   inject,
   signal,
} from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { TranslocoModule } from "@ngneat/transloco";
import { SliderCalculationPipe } from "../pipe/slider-calc.pipe";
import { TimeFormatterPipe } from "../pipe/time-format.pipe";
import { ExecutigonPlanItemTime } from "../interface/execution-plan";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar } from "@angular/material/snack-bar";
// import { ToastService } from "@shared/services/toast.service";

interface TimeFormGroup {
   from: FormControl<string>;
   until: FormControl<string>;
}

@Component({
   selector: "time-range-slider",
   standalone: true,
   templateUrl: "./time-range-slider.component.html",
   imports: [
      ReactiveFormsModule,
      TimeFormatterPipe,
      NgFor,
      NgIf,
      SliderCalculationPipe,
      MatIconModule
   ],
   styleUrls: ['./time-range-slider.component.scss'],
   changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeRangeSliderComponent implements OnInit {
   @Input() initialTimes: ExecutigonPlanItemTime[] = [{ from: "00:00", until: "23:59" }];
   @Output() updatedTimes: EventEmitter<ExecutigonPlanItemTime[]> = 
                     new EventEmitter<ExecutigonPlanItemTime[]>();
   @Output() changesMade: EventEmitter<boolean> = new EventEmitter<boolean>();

   @ViewChild("formContainer") formContainer: ElementRef;
   @ViewChild("saveButton") saveButton: ElementRef;
   @ViewChild("sliderContainer", { static: false }) sliderContainer: ElementRef;

   isDragging = signal<boolean>(false);
   draggedIndex = signal<number>(0);
   draggedHandle = signal<"from" | "until">("from");

   isChangesMade = signal(false);
   isFormVisible = signal(false);

   sliderValues = signal<{ from: number; until: number }[]>([]); //slider is in minutes
   timeForms = signal<FormGroup<TimeFormGroup>[]>([]); //but form is in time. each pair of from/until is a separate formGroup

   private toastService = inject(MatSnackBar);

   constructor() {}

   private boundDocumentClickHandler: EventListener;

   ngOnInit() {
      this.initialTimes.sort((a, b) => {
            return a.from.localeCompare(b.from);
         }).forEach((time) => this.addNewPair(time));
      this.boundDocumentClickHandler = this.onDocumentClick.bind(this);
      document.addEventListener("click", this.boundDocumentClickHandler);
   }

   ngOnDestroy() {
      document.removeEventListener("click", this.boundDocumentClickHandler);
   }

   onDocumentClick(event: MouseEvent | TouchEvent) {
      // Check if the click was outside of the form area
      if (this.formContainer && !this.formContainer.nativeElement.contains(event.target as HTMLElement)) {
         const targetId = (event.target as HTMLElement).id;
         if (this.isChangesMade() && targetId != "saveButton") {
            this.toastService.open('Please save time');
         }
      }
   }

   saveValue() {
      const upd = this.mergeIntervals(this.timeForms());
      this.updatedTimes.emit(upd);
      this.isFormVisible.set(!this.isFormVisible());
      this.isChangesMade.set(false);
      this.changesMade.emit(this.isChangesMade());
      this.toastService.open('Time selection is saved. Overlapping periods are merged');
   }

   addNewPair(newPair: ExecutigonPlanItemTime) {
      const newFormGroup = new FormGroup<TimeFormGroup>(
         {
            from: new FormControl<string>(newPair.from, { validators: Validators.required }),
            until: new FormControl<string>(newPair.until, { validators: Validators.required }),
         },
         { validators: this.timeValidator },
      );

      // Update the form array with the new typed form group
      this.timeForms.update((pairs) => [...pairs, newFormGroup]);

      // Update the slider values
      this.sliderValues.update((values) => [
         ...values,
         {
            from: this.timeToMinutes(newPair.from),
            until: this.timeToMinutes(newPair.until),
         },
      ]);
   }

   removeSelectorPair(index: number) {
      //if the user deletes the last item, timerange comes back to initial values
      if (this.timeForms().length === 1) {
         this.isFormVisible.set(!this.isFormVisible());
         this.timeForms.set([]);
         this.sliderValues.set([]);
         this.initialTimes
            .sort((a, b) => {
               return a.from.localeCompare(b.from);
            })
            .forEach((time) => this.addNewPair(time));
      } else {
         //else the timeform with this index is deleted
         this.timeForms().splice(index, 1);
         this.sliderValues().splice(index, 1);
      }
   }

   mergeIntervals(timeForms: FormGroup[]) {
      timeForms = timeForms.sort((a, b) => {
         return a.value.from.localeCompare(b.value.from);
      });

      const mergedIntervals: ExecutigonPlanItemTime[] = [];
      let start = "";
      let end = "";

      // Iterate over each interval in the timeForms array
      for (const form of timeForms) {
         const interval = form.value;

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
      this.timeForms.set([]);
      this.sliderValues.set([]);
      mergedIntervals.forEach((time) => this.addNewPair(time));
      return mergedIntervals;
   }

   toggleFormVisibility() {
      this.isFormVisible.set(!this.isFormVisible());
   }

   onTimeInputChange(form: FormGroup, index: number) {
      this.isChangesMade.set(true);
      this.changesMade.emit(this.isChangesMade());
      if (form.valid) {
         this.sliderValues()[index] = {
            from: this.timeToMinutes(form.value.from),
            until: this.timeToMinutes(form.value.until),
         };
         this.timeForms()[index].patchValue({
            from: form.value.from,
            until: form.value.until,
         });

         /* with these two lines updated times will be send to the parent component immideately, 
      and user can ignore alert messages. Time intervals will be merged on save report in parent component*/
         // Explicitly transform the form values to ExecutigonPlanItemTime
         const timeForms: ExecutigonPlanItemTime[] = this.timeForms().map((formGroup) => ({
            from: formGroup.value.from,
            until: formGroup.value.until,
         }));
         this.updatedTimes.emit(timeForms);
      }
   }

   timeValidator = (form: FormGroup) => {
      const fromTime = this.timeToMinutes(form.get("from").value);
      const untilTime = this.timeToMinutes(form.get("until").value);
      if (fromTime >= untilTime) {
         return { fromBeforeUntil: true };
      }
      return null;
   };

   timeToMinutes(time: string): number {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
   }

   minutesToTime(minutes: number): string {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
   }

   private updateThumbPosition(index: number, handle: "from" | "until", clientX: number): void {
      const sliderRect = this.sliderContainer.nativeElement.getBoundingClientRect();

      const mouseX = clientX - sliderRect.left;
      const sliderWidth = sliderRect.width;
      const percentage = Math.max(0, Math.min(1, mouseX / sliderWidth));
      const timeInMinutes = Math.round(percentage * 1440);
      const newTime = this.minutesToTime(timeInMinutes);

      // Get the current "from" and "until" values for this index
      const fromValue = this.sliderValues()[index].from;
      const untilValue = this.sliderValues()[index].until;

      if (handle === "from") {
         // "from" must be >= 00:00 and < "until"
         if (timeInMinutes >= 0 && timeInMinutes < untilValue) {
            this.timeForms()[index].patchValue({ from: newTime });
            this.sliderValues()[index].from = timeInMinutes;
         } else {
            this.sliderValues()[index].from = untilValue;
            this.stopDragging();
         }
      } else if (handle === "until") {
         // "until" must be <= 23:59 and > "from"
         if (timeInMinutes <= 1440 && timeInMinutes > fromValue) {
            this.timeForms()[index].patchValue({ until: newTime });
            this.sliderValues()[index].until = timeInMinutes;
         } else {
            this.sliderValues()[index].from = fromValue;
            this.stopDragging();
         }
      }
      this.onTimeInputChange(this.timeForms()[index], index);
   }

   startDragging(index: number, handle: "from" | "until", event: MouseEvent | TouchEvent) {
      const targetElement = event.target as HTMLElement;
      
      if (targetElement && targetElement.classList.contains("drag-drop")) {
         if (!this.isFormVisible()) {
            this.toggleFormVisibility();
         }
         this.isDragging.set(true);
         this.draggedIndex.set(index);
         this.draggedHandle.set(handle);

         if (event instanceof MouseEvent) {
            document.addEventListener("mousemove", this.onMouseMove.bind(this));
            document.addEventListener("mouseup", this.stopDragging.bind(this));
         } else if (event instanceof TouchEvent) {
            document.addEventListener("touchmove", this.onTouchMove.bind(this));
            document.addEventListener("touchend", this.stopDragging.bind(this));
         }

         event.stopPropagation();
         event.preventDefault();
      }
   }

   onMouseMove(event: MouseEvent) {
      if (this.isDragging()) {
         this.updateThumbPosition(this.draggedIndex(), this.draggedHandle(), event.clientX);
         event.stopPropagation();
         event.preventDefault();
      }
   }

   onTouchMove(event: TouchEvent) {
      if (this.isDragging()) {
         this.updateThumbPosition(this.draggedIndex(), this.draggedHandle(), event.touches[0].clientX);
         event.stopPropagation();
         event.preventDefault();
      }
   }

   stopDragging(event?: MouseEvent | TouchEvent) {
      if (this.isDragging()) {
         this.isDragging.set(false);
         this.draggedIndex.set(null);
         this.draggedHandle.set(null);

         document.removeEventListener("mousemove", this.onMouseMove.bind(this));
         document.removeEventListener("mouseup", this.stopDragging.bind(this));
         document.removeEventListener("touchmove", this.onTouchMove.bind(this));
         document.removeEventListener("touchend", this.stopDragging.bind(this));

         this.saveValue();

         event?.stopPropagation();
         event?.preventDefault();
      }
   }
}
