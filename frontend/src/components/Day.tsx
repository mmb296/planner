import React from 'react';

import { CalendarEvent } from '../types';
import Event from './Event';

type DayProps = {
  label: string;
  events: CalendarEvent[];
};

const Day: React.FC<DayProps> = ({ label, events }) => (
  <li>
    <div className="day-header">{label}</div>
    <ul>
      {events.map((event, idx) => (
        <Event key={event.id || idx} event={event} />
      ))}
    </ul>
  </li>
);

export default Day;
