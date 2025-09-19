import { CalendarEvent } from '../types';

export function getTodayDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function daysFromNow(time: number): number {
  return Math.floor((time - getTodayDate().getTime()) / (1000 * 60 * 60 * 24));
}

// Returns a formatted time string (e.g., "10:30 AM") for a given ISO date string
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function isEventPast(event: CalendarEvent): boolean {
  const endTime = event.end.dateTime;
  if (!endTime) return false;
  return new Date() > new Date(endTime);
}

export function getFutureDate(days: number) {
  const futureDate = new Date(getTodayDate());
  futureDate.setDate(futureDate.getDate() + days);
  return futureDate;
}

export function getStartTime(event: CalendarEvent) {
  return new Date(
    event.start.dateTime || `${event.start.date}T00:00:00`
  ).getTime();
}

export function getEndTime(event: CalendarEvent): number {
  if (event.end.dateTime) {
    return new Date(event.end.dateTime).getTime();
  }

  // All-day event - end.date is exclusive (day after event ends)
  // So we subtract 1 day to get the actual last day
  const endDate = new Date(`${event.end.date}T00:00:00`);
  endDate.setDate(endDate.getDate() - 1);
  return endDate.getTime();
}

export function formatHeaderDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

export function getEventSpanDays(event: CalendarEvent): number[] {
  const startTime = getStartTime(event);
  const endTime = getEndTime(event);

  const spanDays: number[] = [];
  for (let day = daysFromNow(startTime); day <= daysFromNow(endTime); day++) {
    spanDays.push(day);
  }

  return spanDays;
}
