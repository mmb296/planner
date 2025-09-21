import './App.css';

import React, { useEffect, useRef, useState } from 'react';

import DaysSelect from './components/DaysSelect';
import EventList from './components/EventList';
import { CalendarEvent } from './types';
import { getFutureDate, getTodayDate } from './utils/dateTime';

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

// Read calendar IDs from environment variable and split into an array
const CALENDAR_IDS = (process.env.REACT_APP_CALENDAR_IDS || 'primary')
  .split(',')
  .map((id) => id.trim());

function App() {
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
      ).google.accounts.oauth2.initTokenClient({
        client_id: process.env.REACT_APP_CLIENT_ID,
        scope: SCOPES,
        callback: '' // Will be set before requesting token
      });
    }
    return tokenClient.current;
  };

  // Handle authentication and fetch events
  const handleAuthClick = () => {
    const client = getTokenClient();
    client.callback = (resp: any) => {
      if (resp.error !== undefined) {
        setEvents([]);
        setIsAuthenticated(false);
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

    const fetchEvents = (calendarId: string) => {
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
      );
      url.search = new URLSearchParams(params).toString();
      return fetch(url.toString(), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              throw new Error('Authentication failed');
            }
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) =>
          (data.items || []).map((event: CalendarEvent) => ({
            ...event,
            calendarId
          }))
        );
    };

    try {
      const results = await Promise.all(CALENDAR_IDS.map(fetchEvents));
      const allEvents = results.flat();
      setEvents(allEvents);
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message === 'Authentication failed') {
        setIsAuthenticated(false);
        sessionStorage.removeItem('access_token');
        setEvents([]);
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

  return (
    <div className="App">
      <header className="App-header">
        {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </header>
      <DaysSelect value={days} onChange={setDays} />
      <div style={{ margin: '16px 0' }}>
        <label>
          Show all:
          <input
            type="checkbox"
            checked={showAllCals}
            onChange={(e) => setShowAllCals(e.target.checked)}
          />
        </label>
      </div>
      <EventList events={filteredEvents} maxDays={days} />
      <button onClick={handleAuthClick}>
        {isAuthenticated ? 'Refresh' : 'Authorize'}
      </button>
    </div>
  );
}

export default App;
