export function getTodayDate(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export function getDaysFromNow(dateA: Date): number {
  return Math.floor(
    (dateA.getTime() - getTodayDate().getTime()) / (1000 * 60 * 60 * 24)
  );
}
