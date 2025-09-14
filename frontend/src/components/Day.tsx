import React from 'react';

import { CalendarEvent } from '../types';
import { getEventStart } from '../utils/dateTime';
import Event from './Event';

type DayProps = {
  label: string;
  events: CalendarEvent[];
};

const Day: React.FC<DayProps> = ({ label, events }) => {
  const sortedEvents = [...events].sort(
    (a, b) => getEventStart(a) - getEventStart(b)
  );

  return (
    <li>
      <div className="day-header">{label}</div>
      <ul>
        {sortedEvents.map((event, idx) => (
          <Event key={event.id || idx} event={event} />
        ))}
      </ul>
    </li>
  );
};

export default Day;
