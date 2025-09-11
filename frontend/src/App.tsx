import './App.css';

import React, { useEffect, useRef, useState } from 'react';

import EventList from './components/EventList';
import { CalendarEvent } from './types';
import { getFutureDate, getTodayDate } from './utils/dateTime';

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

function App() {
  const tokenClient = useRef<any>(null);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!sessionStorage.getItem('access_token')
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [days, setDays] = useState<number>(14);

  // Only initializes once and returns the client
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

  const listUpcomingEvents = async (token: string, daysToFetch = days) => {
    const url = new URL(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    );

    const params = {
      calendarId: 'primary',
      orderBy: 'startTime',
      singleEvents: 'true',
      timeMin: getTodayDate().toISOString(),
      timeMax: getFutureDate(daysToFetch).toISOString()
    };
    url.search = new URLSearchParams(params).toString();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.status === 401 || response.status === 403) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('access_token');
        return;
      }
      const data = await response.json();
      if (data.items) {
        setEvents(data.items);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const savedToken = sessionStorage.getItem('access_token');
    if (!savedToken) return;
    listUpcomingEvents(savedToken, days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <div className="App">
      <header className="App-header">
        {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </header>
      <div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={1}>1 day</option>
          <option value={3}>3 days</option>
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>
      {events.length > 0 && <EventList events={events} />}
      <button onClick={handleAuthClick}>
        {isAuthenticated ? 'Refresh' : 'Authorize'}
      </button>
    </div>
  );
}

export default App;
