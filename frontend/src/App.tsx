import './App.css';

import { useEffect, useRef, useState } from 'react';

import Calendar from './components/calendar/Calendar';
import DaysSelect from './components/calendar/DaysSelect';
import TaskList from './components/tasks/TaskList';
import { AuthenticationError, HttpError } from './errors';
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

  // Clear authentication state and stored token
  const clearAuthentication = () => {
    sessionStorage.removeItem('access_token');
    setIsAuthenticated(false);
    setEvents([]);
  };

  // Handle authentication and fetch events
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

  return (
    <div className="App">
      <header className="App-header">
        {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </header>
      {isAuthenticated && (
        <>
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
          <div className="main-content">
            <TaskList />
            <Calendar events={filteredEvents} maxDays={days} />
          </div>
        </>
      )}
      <button onClick={handleAuthClick}>
        {isAuthenticated ? 'Refresh' : 'Authorize'}
      </button>
    </div>
  );
}

export default App;
