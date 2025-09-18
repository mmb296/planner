import React from 'react';

import { CalendarEvent } from '../types';
import { formatHeaderDate, getEventStart } from '../utils/dateTime';
import Event from './Event';

type DayProps = {
  label: string;
  date: Date;
  events: CalendarEvent[];
};

const Day: React.FC<DayProps> = ({ label, date, events }) => {
  const sortedEvents = [...events].sort(
    (a, b) => getEventStart(a) - getEventStart(b)
  );

  return (
    <li>
      <div className="day-header">
        <span className="day-label">{label}</span>
        <span className="day-date">{formatHeaderDate(date)}</span>
      </div>
      <ul>
        {sortedEvents.map((event, idx) => (
          <Event key={event.id || idx} event={event} />
        ))}
      </ul>
    </li>
  );
};

export default Day;
