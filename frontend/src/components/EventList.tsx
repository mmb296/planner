import React from 'react';

import { EventsMap } from '../types';
import Day from './Day';

type EventListProps = {
  eventsByDay: EventsMap;
};

const EventList: React.FC<EventListProps> = ({ eventsByDay }) => (
  <ul className="event-list">
    {Array.from(eventsByDay.entries()).map(([label, events]) => (
      <Day key={label} label={label} events={events} />
    ))}
  </ul>
);

export default EventList;
