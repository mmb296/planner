import React from 'react';

import { CalendarEvent } from '../../types';
import { formatWeekdayDate, getStartTime } from '../../utils/dateTime';
import styles from './Day.module.css';
import Event from './Event';

type DayProps = {
  label: string;
  date: Date;
  events: CalendarEvent[];
};

const Day: React.FC<DayProps> = ({ label, date, events }) => {
  const sortedEvents = [...events].sort(
    (a, b) => getStartTime(a) - getStartTime(b)
  );

  return (
    <li>
      <div className={styles.dayHeader}>
        <span className={styles.dayLabel}>{label}</span>
        <span className={styles.dayDate}>{formatWeekdayDate(date)}</span>
      </div>
      <ul>
        {sortedEvents.length > 0 ? (
          sortedEvents.map((event) => <Event key={event.id} event={event} />)
        ) : (
          <li style={{ color: 'var(--secondary-color)', fontStyle: 'italic' }}>
            No events
          </li>
        )}
      </ul>
    </li>
  );
};

export default Day;
