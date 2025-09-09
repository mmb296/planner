import React from 'react';

import { CalendarEvent } from '../types';
import { formatTime } from '../utils/dateTime';

function getDotColor(event: CalendarEvent): string {
  if (!event.start.dateTime) return '#f4d9e8'; // All Day
  const hour = new Date(event.start.dateTime).getHours();
  if (hour < 12) return '#d9e2f2'; // Morning
  if (hour < 17) return '#f8e9bd'; // Afternoon
  return '#cec8f7'; // Night
}

const Event: React.FC<{ event: CalendarEvent }> = ({ event }) => (
  <li>
    <span
      className="event-dot"
      style={{ backgroundColor: getDotColor(event) }}
    />
    <span className="event-time">
      {event.start.dateTime ? formatTime(event.start.dateTime) : 'All Day'}
    </span>
    <span> - {event.summary}</span>
  </li>
);

export default Event;
