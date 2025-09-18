import React from 'react';

import { CalendarEvent } from '../types';
import { formatHeaderDate, getEventStart } from '../utils/dateTime';
import styles from './Day.module.css';
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
      <div className={styles.dayHeader}>
        <span className={styles.dayLabel}>{label}</span>
        <span className={styles.dayDate}>{formatHeaderDate(date)}</span>
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
