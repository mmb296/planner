export function getTodayDate(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
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
