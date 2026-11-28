export interface IstClock {
    minute: number;
    hour: number;
    date: string;
    dayOfMonth: number;
    weekday: number;
}
export declare function istClock(now: Date): IstClock;
export declare function inWindow(minute: number, from: number, to: number): boolean;
export declare function nextIstMidnight(now: Date): Date;
export declare function formatIstMinute(minuteOfDay: number, short?: boolean): string;
