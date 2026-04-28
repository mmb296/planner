import { CalendarEvent } from '../types';
import { getEventSpanDays } from '../utils/dateTime';

export function filterAndGroupEventsByDay(
  events: CalendarEvent[],
  selectedCalendarIds: Set<string>,
  numDays: number
): Map<number, CalendarEvent[]> {
  const filteredEvents = events.filter((event) =>
    selectedCalendarIds.has(event.calendarId)
  );

  const eventsByDay: Map<number, CalendarEvent[]> = filteredEvents.reduce(
    (map, event) => {
      const spanDays = getEventSpanDays(event);
      spanDays.forEach((daysOut: number) => {
        if (daysOut < 0 || daysOut > numDays - 1) return;
        if (!map.has(daysOut)) map.set(daysOut, []);
        map.get(daysOut)!.push(event);
      });
      return map;
    },
    new Map<number, CalendarEvent[]>()
  );

  // fill empty days up to the first event so days with no events still render
  const fillDaysUntil =
    eventsByDay.size > 0
      ? Math.min(...Array.from(eventsByDay.keys()))
      : numDays;
  for (let daysOut = 0; daysOut < fillDaysUntil; daysOut++) {
    eventsByDay.set(daysOut, []);
  }

  // always show tomorrow even when today has events but tomorrow doesn't
  if (!eventsByDay.has(1) && numDays > 1) {
    eventsByDay.set(1, []);
  }

  return eventsByDay;
}

export function getDayLabel(daysOut: number): string {
  if (daysOut === 0) return 'TODAY';
  if (daysOut === 1) return 'TOMORROW';
  return `${daysOut} DAYS`;
}
