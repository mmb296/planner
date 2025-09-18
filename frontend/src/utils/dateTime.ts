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

export function getEventStart(event: CalendarEvent) {
  return new Date(
    event.start.dateTime || `${event.start.date}T00:00:00`
  ).getTime();
}

// Returns a formatted date string for day headers (e.g., "Thu, Sep 18")
export function formatHeaderDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}
