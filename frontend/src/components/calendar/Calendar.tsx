import React, { useEffect, useRef, useState } from 'react';

import { usePeriodDays } from '../../hooks/usePeriodDays';
import { usePeriodPrediction } from '../../hooks/usePeriodPrediction';
import { CalendarService } from '../../services/calendarService';
import {
  fetchEvents,
  listCalendars
} from '../../services/googleCalendarService';
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

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

const Calendar: React.FC = () => {
  const tokenClient = useRef<any>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(
    !!sessionStorage.getItem('access_token')
  );
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

  // Returns the token client, initializing if needed
  const getTokenClient = () => {
    if (!tokenClient.current) {
      tokenClient.current = (
        window as any
      ).google?.accounts?.oauth2?.initTokenClient({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '' // Will be set before requesting token
      });
    }
    return tokenClient.current;
  };

  // Clear authentication state and stored token
  const clearAuthentication = () => {
    sessionStorage.removeItem('access_token');
    setIsAuthenticated(false);
    setAllEvents([]);
  };

  // Fetch calendars from Google Calendar API
  const fetchCalendars = async (token: string) => {
    try {
      const calendars = await listCalendars(token);
      setCalendars(calendars);
      // Select all calendars by default
      setSelectedCalendarIds(new Set(calendars.map((cal) => cal.id)));
    } catch (error: any) {
      if (error.message === 'AUTH_ERROR') {
        clearAuthentication();
      }
    }
  };

  // Fetch events from Google Calendar API (all calendars)
  const fetchUpcomingEvents = async (token: string, daysToFetch = numDays) => {
    try {
      const timeMin = getTodayDate();
      const timeMax = getFutureDate(daysToFetch);
      const allEvents = await fetchEvents(calendars, timeMin, timeMax, token);
      setAllEvents(allEvents);
    } catch (error: any) {
      if (error.message === 'AUTH_ERROR') {
        clearAuthentication();
      }
    }
  };

  // Handle authentication
  const handleAuthClick = () => {
    const client = getTokenClient();
    client.callback = (resp: any) => {
      if (resp.error !== undefined) {
        clearAuthentication();
        return;
      }
      sessionStorage.setItem('access_token', resp.access_token);
      setIsAuthenticated(true);
      fetchCalendars(resp.access_token);
    };
    client.requestAccessToken();
  };

  useEffect(() => {
    const savedToken = sessionStorage.getItem('access_token');
    if (!savedToken) return;
    fetchCalendars(savedToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('access_token');
    if (!savedToken || calendars.length === 0) return;
    fetchUpcomingEvents(savedToken, numDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numDays, calendars]);

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

  const authenticatedHeaderContent = isAuthenticated && (
    <div className={styles.calendarOptions}>
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
      <DaysSelect value={numDays} onChange={setNumDays} />
    </div>
  );

  const eventsContent = isAuthenticated ? (
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
      <button onClick={handleAuthClick} className={styles.signInButton}>
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
        {authenticatedHeaderContent}
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
      {eventsContent}
      <PeriodModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
      />
    </div>
  );
};

export default Calendar;
