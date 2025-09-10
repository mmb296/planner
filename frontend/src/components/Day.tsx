import React from 'react';

import { CalendarEvent } from '../types';
import Event from './Event';

type DayProps = {
  dayLabel: string;
  events: CalendarEvent[];
};

const Day: React.FC<DayProps> = ({ dayLabel, events }) => (
  <li>
    <div className="day-header">{dayLabel}</div>
    <ul>
      {events.map((event, idx) => (
        <Event key={event.id || idx} event={event} />
      ))}
    </ul>
  </li>
);

export default Day;
