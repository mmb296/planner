import React from 'react';

import { CalendarEvent } from '../types';
import { getEventSpanDays, getFutureDate } from '../utils/dateTime';
import Day from './Day';
import styles from './EventList.module.css';

type EventsMap = Map<number, CalendarEvent[]>;

const getDayLabel = (diffDays: number): string => {
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'TOMORROW';
  return `${diffDays} DAYS`;
};

const EventList: React.FC<{ events: CalendarEvent[]; maxDays: number }> = ({
  events,
  maxDays
}) => {
  const eventsByDay: EventsMap = events.reduce((acc, event) => {
    const spanDays = getEventSpanDays(event, maxDays);
    spanDays.forEach((day) => {
      if (!acc.has(day)) acc.set(day, []);
      acc.get(day)!.push(event);
    });
    return acc;
  }, new Map() as EventsMap);

  return (
    <ul className={styles.eventList}>
      {Array.from(eventsByDay.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([diffDays, events]) => (
          <Day
            key={diffDays}
            label={getDayLabel(diffDays)}
            date={getFutureDate(diffDays)}
            events={events}
          />
        ))}
    </ul>
  );
};

export default EventList;
