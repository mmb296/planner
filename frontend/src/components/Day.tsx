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
      <div
        className="day-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>{label}</span>
        <span>{formatHeaderDate(date)}</span>
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
