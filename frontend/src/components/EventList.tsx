import React from 'react';

import { CalendarEvent } from '../types';
import { daysFromNow, getEventStart } from '../utils/dateTime';
import Day from './Day';

export type EventsMap = Map<number, CalendarEvent[]>;

const getDayLabel = (diffDays: number): string => {
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'TOMORROW';
  return `${diffDays} DAYS`;
};

const EventList: React.FC<{ events: CalendarEvent[] }> = ({ events }) => {
  const eventsByDay: EventsMap = events.reduce((acc, event) => {
    const diffDays = daysFromNow(getEventStart(event));
    if (!acc.has(diffDays)) acc.set(diffDays, []);
    acc.get(diffDays)!.push(event);
    return acc;
  }, new Map() as EventsMap);

  return (
    <ul className="event-list">
      {Array.from(eventsByDay.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([diffDays, events]) => (
          <Day key={diffDays} label={getDayLabel(diffDays)} events={events} />
        ))}
    </ul>
  );
};

export default EventList;
