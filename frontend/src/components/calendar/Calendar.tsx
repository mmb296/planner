import React, { useEffect, useState } from 'react';

import { API_ENDPOINTS } from '../../config/api';
import { useCalendarContext } from '../../context/CalendarContext';
import { usePeriodDays } from '../../hooks/usePeriodDays';
import { usePeriodPrediction } from '../../hooks/usePeriodPrediction';
import {
  filterAndGroupEventsByDay,
  getDayLabel
} from '../../services/calendarService';
import {
  formatDateString,
  formatLongDate,
  formatPredictionDate,
  getFutureDate,
  getTodayDate
} from '../../utils/dateTime';
import PeriodModal from '../periods/PeriodModal';
import styles from './Calendar.module.css';
import CalendarIcon from './CalendarIcon';
import Day from './Day';
import DaysSelect from './DaysSelect';

const Calendar: React.FC = () => {
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const { state, dispatch } = useCalendarContext();
  const { status, calendars, selectedCalendarIds, allEvents, numDays } = state;
  const isAuthenticated = status === 'authenticated';

  const {
    periodDays,
    togglePeriodDay,
    refetch: refetchPeriodDays
  } = usePeriodDays(getTodayDate(), getFutureDate(numDays - 1));
  const { prediction, refetch: refetchPrediction } = usePeriodPrediction();

  // Refetch period days and prediction when the period calendar modal closes
  useEffect(() => {
    if (!showPeriodModal) {
      refetchPeriodDays();
      refetchPrediction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPeriodModal]);

  // Refetch prediction when period days change (after toggle)
  // TODO: clean this up
  useEffect(() => {
    refetchPrediction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDays.size]);

  // Filter and group events by day
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
            const dateStr = formatDateString(date);
            return (
              <Day
                key={daysOut}
                label={getDayLabel(daysOut)}
                date={date}
                events={events}
                isPeriodDay={periodDays.has(dateStr)}
                onDotToggle={(date) => {
                  togglePeriodDay(formatDateString(date));
                }}
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
      <div className={styles.predictionBanner}>
        {prediction && prediction.nextPeriodDate ? (
          <div className={styles.predictionContent}>
            <span className={styles.predictionLabel}>
              Next period predicted:
            </span>
            <span className={styles.predictionDate}>
              {formatPredictionDate(prediction.nextPeriodDate)}
            </span>
            {prediction.averageCycleLength && (
              <span className={styles.predictionCycle}>
                (avg {prediction.averageCycleLength} day cycle)
              </span>
            )}
          </div>
        ) : (
          <div className={styles.predictionContent}>
            <span className={styles.predictionLabel}>
              No prediction available
            </span>
          </div>
        )}
        <button
          onClick={() => setShowPeriodModal(true)}
          className={styles.periodCalendarButton}
          title="Open period calendar"
        >
          <CalendarIcon className={styles.periodCalendarIcon} />
        </button>
      </div>
      {calendarList}
      {eventsContent}
      <PeriodModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
      />
    </div>
  );
};

export default Calendar;
