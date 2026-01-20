import { CalendarEvent } from '../types';
import { getEventSpanDays } from '../utils/dateTime';

export class CalendarService {
  /**
   * Filter events by selected calendar IDs and group by day
   */
  static filterAndGroupEventsByDay(
    events: CalendarEvent[],
    selectedCalendarIds: Set<string>,
    numDays: number
  ): Map<number, CalendarEvent[]> {
    // Filter events by selected calendars
    const filteredEvents = events.filter((event) =>
      selectedCalendarIds.has(event.calendarId)
    );
    // Group events by day difference from today
    const eventsByDay: Map<number, CalendarEvent[]> = filteredEvents.reduce(
      (map, event) => {
        const spanDays = getEventSpanDays(event);
        spanDays.forEach((daysOut: number) => {
          const maxDaysOut = numDays - 1;
          if (daysOut < 0 || daysOut > maxDaysOut) return;
          if (!map.has(daysOut)) map.set(daysOut, []);
          map.get(daysOut)!.push(event);
        });
        return map;
      },
      new Map<number, CalendarEvent[]>()
    );

    // Fill in empty days from today up to the first event
    const fillDaysUntil =
      eventsByDay.size > 0
        ? Math.min(...Array.from(eventsByDay.keys()))
        : numDays;
    for (let daysOut = 0; daysOut < fillDaysUntil; daysOut++) {
      eventsByDay.set(daysOut, []);
    }

    // Also show TOMORROW even if TODAY has events but it does not
    if (!eventsByDay.has(1) && numDays > 1) {
      eventsByDay.set(1, []);
    }

    return eventsByDay;
  }

  /**
   * Get day label for display
   */
  static getDayLabel(daysOut: number): string {
    if (daysOut === 0) return 'TODAY';
    if (daysOut === 1) return 'TOMORROW';
    return `${daysOut} DAYS`;
  }
}
