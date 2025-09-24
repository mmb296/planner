import React, { useEffect, useRef, useState } from 'react';

import { AuthenticationError, HttpError } from '../../errors';
import { CalendarEvent } from '../../types';
import {
  getEventSpanDays,
  getFutureDate,
  getTodayDate
} from '../../utils/dateTime';
import styles from './Calendar.module.css';
import Day from './Day';
import DaysSelect from './DaysSelect';

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

// Read calendar IDs from environment variable and split into an array
const CALENDAR_IDS = (process.env.REACT_APP_CALENDAR_IDS || 'primary')
  .split(',')
  .map((id) => id.trim());

type EventsMap = Map<number, CalendarEvent[]>;

const getDayLabel = (diffDays: number): string => {
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'TOMORROW';
  return `${diffDays} DAYS`;
};

const Calendar: React.FC = () => {
  const tokenClient = useRef<any>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(
    !!sessionStorage.getItem('access_token')
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [days, setDays] = useState(14);
  const [showAllCals, setShowAllCals] = useState(false);

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
      listUpcomingEvents(resp.access_token, days);
    };
    client.requestAccessToken();
  };

  // Fetch events from Google Calendar API
  const listUpcomingEvents = async (token: string, daysToFetch = days) => {
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
          throw new AuthenticationError(
            'Authentication failed',
            response.status
          );
        }
        throw new HttpError(
          `Failed to fetch events: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return (data.items || []).map((event: CalendarEvent) => ({
        ...event,
        calendarId
      }));
    };

    try {
      const results = await Promise.all(CALENDAR_IDS.map(fetchEvents));
      const allEvents = results.flat();
      setEvents(allEvents);
    } catch (error) {
      console.error(error);
      if (error instanceof AuthenticationError) {
        clearAuthentication();
      }
    }
  };

  // Fetch events when days changes or on initial load (if authenticated)
  useEffect(() => {
    const savedToken = sessionStorage.getItem('access_token');
    if (!savedToken) return;
    listUpcomingEvents(savedToken, days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  // Filter events based on toggle
  const filteredEvents = showAllCals
    ? events
    : events.filter((event) => event.calendarId === 'primary');

  // Group events by day
  const eventsByDay: EventsMap = filteredEvents.reduce((acc, event) => {
    const spanDays = getEventSpanDays(event);
    spanDays.forEach((day) => {
      if (day < 0 || day > days - 1) return;
      if (!acc.has(day)) acc.set(day, []);
      acc.get(day)!.push(event);
    });
    return acc;
  }, new Map() as EventsMap);

  // Fill in empty days from today up to the first event
  const fillDaysUntil =
    eventsByDay.size > 0 ? Math.min(...Array.from(eventsByDay.keys())) : days;
  for (let day = 0; day < fillDaysUntil; day++) {
    eventsByDay.set(day, []);
  }

  // Also show TOMORROW even if TODAY has events but it does not
  if (!eventsByDay.has(1) && days > 1) eventsByDay.set(1, []);

  if (isAuthenticated) {
    return (
      <div className={styles.calendarSection}>
        <DaysSelect value={days} onChange={setDays} />
        <div className={styles.calendarToggle}>
          <label>
            Show all calendars:
            <input
              type="checkbox"
              checked={showAllCals}
              onChange={(e) => setShowAllCals(e.target.checked)}
            />
          </label>
        </div>
        <ul className={styles.calendar}>
          {Array.from(eventsByDay.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([diffDays, events]) => (
              <Day
                key={diffDays}
                label={getDayLabel(diffDays)}
                date={getFutureDate(diffDays)}
                events={events}
              />
            ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={styles.calendarSection}>
      <div className={styles.placeholder}>
        <p>Sign in with Google Calendar to view your events</p>
        <button onClick={handleAuthClick} className={styles.signInButton}>
          Sign In with Google Calendar
        </button>
      </div>
    </div>
  );
};

export default Calendar;
