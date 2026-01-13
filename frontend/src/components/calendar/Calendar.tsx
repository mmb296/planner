import React, { useEffect, useRef, useState } from 'react';

import { usePeriodDays } from '../../hooks/usePeriodDays';
import { CalendarService } from '../../services/calendarService';
import { CalendarEvent } from '../../types';
import {
  formatDateString,
  getFutureDate,
  getTodayDate
} from '../../utils/dateTime';
import PeriodCalendar from '../periods/PeriodCalendar';
import styles from './Calendar.module.css';
import CalendarIcon from './CalendarIcon';
import Day from './Day';
import DaysSelect from './DaysSelect';

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

// Read calendar IDs from environment variable and split into an array
const CALENDAR_IDS = (process.env.REACT_APP_CALENDAR_IDS || 'primary')
  .split(',')
  .map((id) => id.trim());

const Calendar: React.FC = () => {
  const tokenClient = useRef<any>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(
    !!sessionStorage.getItem('access_token')
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [numDays, setNumDays] = useState(14);
  const [showAllCals, setShowAllCals] = useState(false);
  const [showPeriodCalendar, setShowPeriodCalendar] = useState(false);
  const {
    periodDays,
    togglePeriodDay,
    refetch: refetchPeriodDays
  } = usePeriodDays(getTodayDate(), getFutureDate(numDays - 1));

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
    setEvents([]);
  };

  // Fetch events from Google Calendar API
  const fetchUpcomingEvents = async (token: string, daysToFetch = numDays) => {
    const params = {
      orderBy: 'startTime',
      singleEvents: 'true',
      timeMin: getTodayDate().toISOString(),
      timeMax: getFutureDate(daysToFetch).toISOString()
    };

    const fetchEvents = async (calendarId: string) => {
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
      );
      url.search = new URLSearchParams(params).toString();

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearAuthentication();
        }
        return [];
      }

      const data = await response.json();
      return (data.items || []).map((event: CalendarEvent) => ({
        ...event,
        calendarId
      }));
    };

    const results = await Promise.all(CALENDAR_IDS.map(fetchEvents));
    const allEvents = results.flat();
    setEvents(allEvents);
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
      fetchUpcomingEvents(resp.access_token, numDays);
    };
    client.requestAccessToken();
  };

  // Fetch events when days changes or on initial load (if authenticated)
  useEffect(() => {
    const savedToken = sessionStorage.getItem('access_token');
    if (!savedToken) return;
    fetchUpcomingEvents(savedToken, numDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numDays]);

  // Refetch period days when the period calendar modal closes
  useEffect(() => {
    if (!showPeriodCalendar) {
      refetchPeriodDays();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPeriodCalendar]);

  // Filter and group events
  const eventsByDay = CalendarService.filterAndGroupEventsByDay(
    events,
    showAllCals,
    numDays
  );

  if (isAuthenticated) {
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
          <div className={styles.calendarOptions}>
            <label>
              Show all calendars:
              <input
                type="checkbox"
                checked={showAllCals}
                onChange={(e) => setShowAllCals(e.target.checked)}
              />
            </label>
            <DaysSelect value={numDays} onChange={setNumDays} />
            <button
              onClick={() => setShowPeriodCalendar(true)}
              className={styles.periodCalendarButton}
              title="Open period calendar"
            >
              <CalendarIcon className={styles.periodCalendarIcon} />
            </button>
          </div>
        </header>
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
        <PeriodCalendar
          isOpen={showPeriodCalendar}
          onClose={() => setShowPeriodCalendar(false)}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.calendar} ${styles.placeholder}`}>
      <p>Sign in with Google Calendar to view your events</p>
      <button onClick={handleAuthClick} className={styles.signInButton}>
        Sign In with Google Calendar
      </button>
    </div>
  );
};

export default Calendar;
