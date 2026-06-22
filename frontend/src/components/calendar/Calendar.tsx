import React from 'react';

import { API_ENDPOINTS } from '../../config/api';
import { useCalendarContext } from '../../context/CalendarContext';
import {
  filterAndGroupEventsByDay,
  getDayLabel
} from '../../services/calendarService';
import { formatLongDate, getFutureDate } from '../../utils/dateTime';
import styles from './Calendar.module.css';
import Day from './Day';
import DaysSelect from './DaysSelect';

const Calendar: React.FC = () => {
  const { state, dispatch } = useCalendarContext();
  const { status, calendars, selectedCalendarIds, allEvents, numDays } = state;
  const isAuthenticated = status === 'authenticated';

  const eventsByDay = filterAndGroupEventsByDay(
    allEvents,
    selectedCalendarIds,
    numDays
  );

  const calendarList = isAuthenticated && calendars.length > 0 && (
    <div className={styles.calendarListSection}>
      <div className={styles.calendarCheckboxes}>
        {calendars.map((calendar) => (
          <label
            key={calendar.id}
            className={styles.calendarCheckbox}
            style={
              {
                '--calendar-color': calendar.backgroundColor
              } as React.CSSProperties
            }
          >
            <input
              type="checkbox"
              checked={selectedCalendarIds.has(calendar.id)}
              onChange={(e) =>
                dispatch({
                  type: 'TOGGLE_CALENDAR',
                  id: calendar.id,
                  checked: e.target.checked
                })
              }
            />
            {calendar.summary}
          </label>
        ))}
      </div>
    </div>
  );

  const eventsContent =
    status === 'loading' ? null : isAuthenticated ? (
      <ul className={styles.eventsList}>
        {Array.from(eventsByDay.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([daysOut, events]) => {
            const date = getFutureDate(daysOut);
            return (
              <Day
                key={daysOut}
                label={getDayLabel(daysOut)}
                date={date}
                events={events}
              />
            );
          })}
      </ul>
    ) : (
      <div className={styles.placeholder}>
        <p>Sign in with Google Calendar to view your events</p>
        <button
          onClick={() => {
            window.location.href = API_ENDPOINTS.CALENDAR_AUTH_START;
          }}
          className={styles.signInButton}
        >
          Sign In with Google Calendar
        </button>
      </div>
    );

  return (
    <div className={styles.calendar}>
      <header>
        <h1>{formatLongDate(new Date())}</h1>
        {isAuthenticated && (
          <DaysSelect
            value={numDays}
            onChange={(n) => dispatch({ type: 'SET_NUM_DAYS', numDays: n })}
          />
        )}
      </header>
      {calendarList}
      {eventsContent}
    </div>
  );
};

export default Calendar;
