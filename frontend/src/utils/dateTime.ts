import { CalendarEvent } from '../types';

export function getTodayDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function daysFromNow(date: Date): number {
  return Math.floor(
    (date.getTime() - getTodayDate().getTime()) / (1000 * 60 * 60 * 24)
  );
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
