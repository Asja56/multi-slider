import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
   name: "slidercalc",
   standalone: true,
})
export class SliderCalculationPipe implements PipeTransform {
   transform(sliderValues: { from: number; until: number }, type: string, maxValue: number = 1440): string {
      switch (type) {
         case "width":
            return ((sliderValues.until - sliderValues.from) / maxValue) * 100 + "%";
         case "from":
            return (sliderValues.from / maxValue) * 100 + "%";
         case "until":
            return (sliderValues.until / maxValue) * 100 + "%";
         case "label-until":
            return 100 - (sliderValues.until / maxValue) * 100 + "%";
         default:
            return "";
      }
   }
}
