import './App.css';

import React, { useEffect, useRef, useState } from 'react';

import EventList from './components/EventList';
import { CalendarEvent } from './types';
import { getFutureDate, getTodayDate } from './utils/dateTime';

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

function App() {
  const clientId = process.env.REACT_APP_CLIENT_ID as string;
  const tokenClient = useRef<any>(null);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!sessionStorage.getItem('access_token')
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const initTokenClient = () => {
    if (tokenClient.current) return tokenClient.current;
    tokenClient.current = (
      window as any
    ).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error !== undefined) {
          setEvents([]);
          setIsAuthenticated(false);
          return;
        }
        sessionStorage.setItem('access_token', resp.access_token);
        setIsAuthenticated(true);
        listUpcomingEvents(resp.access_token);
      }
    });
    return tokenClient.current;
  };

  const handleAuthClick = () => {
    initTokenClient().requestAccessToken();
  };

  const listUpcomingEvents = async (token: string) => {
    const url = new URL(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    );

    const params = {
      calendarId: 'primary',
      orderBy: 'startTime',
      singleEvents: 'true',
      timeMin: getTodayDate().toISOString(),
      timeMax: getFutureDate(14).toISOString()
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
    listUpcomingEvents(savedToken);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </header>
      {events.length > 0 && <EventList events={events} />}
      <button onClick={handleAuthClick}>
        {isAuthenticated ? 'Refresh' : 'Authorize'}
      </button>
    </div>
  );
}

export default App;
