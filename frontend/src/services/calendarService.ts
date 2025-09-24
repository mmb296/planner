import { CalendarEvent } from '../types';
import { getEventSpanDays } from '../utils/dateTime';

export class CalendarService {
  /**
   * Filter events by calendar visibility and group them by day
   */
  static filterAndGroupEventsByDay(
    events: CalendarEvent[],
    showAllCalendars: boolean,
    days: number
  ): Map<number, CalendarEvent[]> {
    // Filter events based on calendar visibility preference
    const filteredEvents = showAllCalendars
      ? events
      : events.filter((event) => event.calendarId === 'primary');

    // Group events by day difference from today
    const eventsByDay: Map<number, CalendarEvent[]> = filteredEvents.reduce(
      (acc, event) => {
        const spanDays = getEventSpanDays(event);
        spanDays.forEach((day: number) => {
          if (day < 0 || day > days - 1) return;
          if (!acc.has(day)) acc.set(day, []);
          acc.get(day)!.push(event);
        });
        return acc;
      },
      new Map<number, CalendarEvent[]>()
    );

    // Fill in empty days from today up to the first event
    const fillDaysUntil =
      eventsByDay.size > 0 ? Math.min(...Array.from(eventsByDay.keys())) : days;
    for (let day = 0; day < fillDaysUntil; day++) {
      eventsByDay.set(day, []);
    }

    // Also show TOMORROW even if TODAY has events but it does not
    if (!eventsByDay.has(1) && days > 1) {
      eventsByDay.set(1, []);
    }

    return eventsByDay;
  }

  /**
   * Get day label for display
   */
  static getDayLabel(diffDays: number): string {
    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'TOMORROW';
    return `${diffDays} DAYS`;
  }
}
