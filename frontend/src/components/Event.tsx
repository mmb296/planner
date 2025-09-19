import React from 'react';

import { CalendarEvent } from '../types';
import { formatTime, isEventPast } from '../utils/dateTime';
import styles from './Event.module.css';

function getDotColor(event: CalendarEvent): string {
  // Special color for events starting with 'NO '
  if (event.summary?.startsWith('NO ')) return '#ff6d70';

  if (!event.start.dateTime) return '#f4d9e8'; // All Day
  const hour = new Date(event.start.dateTime).getHours();
  if (hour < 12) return '#d9e2f2'; // Morning
  if (hour < 17) return '#f8e9bd'; // Afternoon
  return '#cec8f7'; // Night
}

function getCalendarLetter(event: CalendarEvent): string {
  // Show first letter of calendarId (unless 'primary')
  if (!event.calendarId || event.calendarId === 'primary') return '';
  return event.calendarId[0].toUpperCase();
}

const Event: React.FC<{ event: CalendarEvent }> = ({ event }) => (
  <li
    className={styles.eventItem}
    style={isEventPast(event) ? { textDecoration: 'line-through' } : {}}
  >
    <span
      className={styles.eventDot}
      style={{ backgroundColor: getDotColor(event) }}
    >
      {getCalendarLetter(event)}
    </span>
    {event.start.dateTime && (
      <span className={styles.eventTime}>
        {formatTime(event.start.dateTime)} -{' '}
      </span>
    )}
    <span style={{ fontWeight: event.start.dateTime ? 400 : 600 }}>
      {event.summary}
    </span>
  </li>
);

export default Event;
