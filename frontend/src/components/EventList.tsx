import React from 'react';

import { CalendarEvent, EventsMap } from '../types';
import { daysFromNow } from '../utils/dateTime';
import Day from './Day';

const getDayLabel = (event: CalendarEvent): string => {
  const start = event.start.dateTime || `${event.start.date}T00:00:00`;
  const eventDate = new Date(start as string);
  const diffDays = daysFromNow(eventDate);

  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'TOMORROW';
  return `${diffDays} DAYS`;
};

const EventList: React.FC<{ events: CalendarEvent[] }> = ({ events }) => {
  const eventsByDay: EventsMap = new Map();

  events.forEach((event) => {
    const dayLabel = getDayLabel(event);

    if (!eventsByDay.has(dayLabel)) eventsByDay.set(dayLabel, []);
    eventsByDay.get(dayLabel)!.push(event);
  });

  return (
    <ul className="event-list">
      {Array.from(eventsByDay.entries()).map(([label, events]) => (
        <Day key={label} label={label} events={events} />
      ))}
    </ul>
  );
};

export default EventList;
