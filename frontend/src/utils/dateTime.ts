import { CalendarEvent } from '../types';

export function getTodayDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
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

export function getEventEnd(event: CalendarEvent): number {
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

// Returns the days an event spans, starting from today (0) going forward
export function getEventSpanDays(event: CalendarEvent): number[] {
  const startTime = getEventStart(event);
  const endTime = getEventEnd(event);
  const today = getTodayDate().getTime();

  const startDay = Math.floor((startTime - today) / (24 * 60 * 60 * 1000));
  const endDay = Math.floor((endTime - today) / (24 * 60 * 60 * 1000));

  const spanDays: number[] = [];
  // Start from today (0) going forward
  for (let day = Math.max(0, startDay); day <= endDay; day++) {
    spanDays.push(day);
  }

  return spanDays;
}
