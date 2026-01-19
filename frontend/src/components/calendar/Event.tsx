import React from 'react';

import { CalendarEvent } from '../../types';
import { formatTime, isEventPast } from '../../utils/dateTime';
import styles from './Event.module.css';

const Event: React.FC<{ event: CalendarEvent }> = ({ event }) => (
  <li
    className={styles.eventItem}
    style={isEventPast(event) ? { textDecoration: 'line-through' } : {}}
  >
    <span
      className={styles.eventDot}
      style={{ backgroundColor: event.color }}
    />
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
