import React, { useEffect, useRef, useState } from 'react';

import { API_ENDPOINTS } from '../../config/api';
import { useCalendarAuth } from '../../hooks/useCalendarAuth';
import { usePeriodDays } from '../../hooks/usePeriodDays';
import { usePeriodPrediction } from '../../hooks/usePeriodPrediction';
import { fetchEvents, listCalendars } from '../../services/calendarApi';
import { CalendarService } from '../../services/calendarService';
import { CalendarEvent, Calendar as CalendarType } from '../../types';
import {
  formatDateString,
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
  const { status, clearAuth } = useCalendarAuth();
  const isAuthenticated = status === 'authenticated';
  const [calendars, setCalendars] = useState<CalendarType[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(
    new Set()
  );
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [numDays, setNumDays] = useState(14);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const {
    periodDays,
    togglePeriodDay,
    refetch: refetchPeriodDays
  } = usePeriodDays(getTodayDate(), getFutureDate(numDays - 1));
  const { prediction, refetch: refetchPrediction } = usePeriodPrediction();

  const clearAuthentication = async () => {
    await clearAuth();
    setCalendars([]);
    setAllEvents([]);
    setSelectedCalendarIds(new Set());
  };

  const clearAuthenticationRef = useRef(clearAuthentication);
  clearAuthenticationRef.current = clearAuthentication;
  const calendarsRef = useRef(calendars);
  calendarsRef.current = calendars;
  const numDaysRef = useRef(numDays);
  numDaysRef.current = numDays;

  const fetchCalendars = async () => {
    try {
      const list = await listCalendars();
      setCalendars(list);
      setSelectedCalendarIds(new Set(list.map((cal) => cal.id)));
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'AUTH_ERROR') {
        await clearAuthentication();
      }
    }
  };

  const fetchUpcomingEvents = async (daysToFetch = numDays) => {
    try {
      const timeMin = getTodayDate();
      const timeMax = getFutureDate(daysToFetch);
      const events = await fetchEvents(calendars, timeMin, timeMax);
      setAllEvents(events);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'AUTH_ERROR') {
        await clearAuthentication();
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchCalendars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || calendars.length === 0) return;
    fetchUpcomingEvents(numDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numDays, calendars, isAuthenticated]);

  /** Live updates when the server finishes a Google Calendar push sync */
  useEffect(() => {
    if (!isAuthenticated || calendars.length === 0) return;

    const es = new EventSource(API_ENDPOINTS.CALENDAR_EVENTS_STREAM);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type?: string };
        if (data.type !== 'calendar_updated') return;
        const timeMin = getTodayDate();
        const timeMax = getFutureDate(numDaysRef.current);
        void fetchEvents(calendarsRef.current, timeMin, timeMax)
          .then(setAllEvents)
          .catch((err: unknown) => {
            if (err instanceof Error && err.message === 'AUTH_ERROR') {
              void clearAuthenticationRef.current();
            }
          });
      } catch {
        /* ignore malformed payloads */
      }
    };

    return () => {
      es.close();
    };
  }, [isAuthenticated, calendars.length]);

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
  const eventsByDay = CalendarService.filterAndGroupEventsByDay(
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
              onChange={(e) => {
                const newSelected = new Set(selectedCalendarIds);
                if (e.target.checked) {
                  newSelected.add(calendar.id);
                } else {
                  newSelected.delete(calendar.id);
                }
                setSelectedCalendarIds(newSelected);
              }}
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
                label={CalendarService.getDayLabel(daysOut)}
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
        <h1>
          {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </h1>
        {isAuthenticated && (
          <DaysSelect value={numDays} onChange={setNumDays} />
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
