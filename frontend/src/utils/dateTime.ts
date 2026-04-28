import { CalendarEvent } from '../types';

export function getTodayDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function isToday(date: Date): boolean {
  const today = getTodayDate();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function daysFromNow(time: number): number {
  return Math.floor((time - getTodayDate().getTime()) / (1000 * 60 * 60 * 24));
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function isEventPast(event: CalendarEvent): boolean {
  const endTime = event.end.dateTime;
  if (!endTime) return false;
  return new Date() > new Date(endTime);
}

export function getFutureDate(daysOut: number) {
  const futureDate = new Date(getTodayDate());
  futureDate.setDate(futureDate.getDate() + daysOut);
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

  // end.date is exclusive (day after event ends), so subtract 1
  const endDate = new Date(`${event.end.date}T00:00:00`);
  endDate.setDate(endDate.getDate() - 1);
  return endDate.getTime();
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatWeekdayDate(date: Date): string {
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

export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getDaysInMonth(date: Date): (Date | null)[] {
  const start = getMonthStart(date);
  const end = getMonthEnd(date);
  const days: (Date | null)[] = [];

  const startDayOfWeek = start.getDay();
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }

  for (let day = 1; day <= end.getDate(); day++) {
    days.push(new Date(date.getFullYear(), date.getMonth(), day));
  }

  return days;
}

export function getPreviousMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

export function getNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export function formatMonthName(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
}

// Format prediction date for display (e.g., "Jan 15" or "Jan 15, 2023" if different year)
export function formatPredictionDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}
