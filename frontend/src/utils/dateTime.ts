import { CalendarEvent } from '../types';

export function getTodayDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// Check if a date is today (compares only the date portion, ignoring time)
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

// Format date as YYYY-MM-DD string
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get the first day of the month for a given date
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Get the last day of the month for a given date
export function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// Get all days in the month (including null padding for week alignment)
// Returns an array of Date objects for days in the month, and null for padding days
export function getDaysInMonth(date: Date): (Date | null)[] {
  const start = getMonthStart(date);
  const end = getMonthEnd(date);
  const days: (Date | null)[] = [];

  // Add padding for days before month starts (to align with week)
  const startDayOfWeek = start.getDay();
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }

  // Add all days in the month
  for (let day = 1; day <= end.getDate(); day++) {
    days.push(new Date(date.getFullYear(), date.getMonth(), day));
  }

  return days;
}

// Get the previous month for a given date
export function getPreviousMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

// Get the next month for a given date
export function getNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

// Format month name (e.g., "January 2024")
export function formatMonthName(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
}
