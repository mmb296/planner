import React from 'react';

import { CalendarEvent, EventsMap } from '../types';
import { daysFromNow } from '../utils/dateTime';
import Day from './Day';

function groupEvents(events: CalendarEvent[]): EventsMap {
  const groupedEvents: EventsMap = new Map();

  events.forEach((event) => {
    const start = event.start.dateTime || `${event.start.date}T00:00:00`;
    const eventDate = new Date(start as string);
    const diffDays = daysFromNow(eventDate);

    let dayLabel: string;
    if (diffDays === 0) dayLabel = 'TODAY';
    else if (diffDays === 1) dayLabel = 'TOMORROW';
    else dayLabel = `${diffDays} DAYS`;

    if (!groupedEvents.has(dayLabel)) groupedEvents.set(dayLabel, []);
    groupedEvents.get(dayLabel)!.push(event);
  });

  return groupedEvents;
}

const EventList: React.FC<{ events: CalendarEvent[] }> = ({ events }) => {
  const eventsByDay = groupEvents(events);

  return (
    <ul className="event-list">
      {Array.from(eventsByDay.entries()).map(([label, events]) => (
        <Day key={label} label={label} events={events} />
      ))}
    </ul>
  );
};

export default EventList;
