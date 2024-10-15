export interface ExecutigonPlanItem {
    id: string;
    selected: boolean;
    times: ExecutigonPlanItemTime[];
  }
  
export interface ExecutigonPlanItemTime {
    from: string;
    until: string;
    getFromHour?: number; 
    getFromMinute?: number; 
    getUntilHour?: number; 
    getUntilMinute?: number; 
  }
  