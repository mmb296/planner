import React, { useEffect, useRef, useState } from 'react';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import './App.css';

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

type CalendarEvent = {
  id: string;
  summary?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  [key: string]: any; // For any additional properties
};

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
    const client = initTokenClient();
    client.requestAccessToken();
  };

  const listUpcomingEvents = async (token: string) => {
    const url = new URL(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    );
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0); // Start of today

    const twoWeeksDate = new Date(todayDate);
    twoWeeksDate.setDate(twoWeeksDate.getDate() + 14);

    const params = {
      calendarId: 'primary',
      orderBy: 'startTime',
      singleEvents: 'true',
      timeMin: todayDate.toISOString(),
      timeMax: twoWeeksDate.toISOString()
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
      console.log(data);
      setEvents(data.items || []);
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
        <CalendarMonth className="App-logo" style={{ fontSize: 200 }} />
        <button onClick={handleAuthClick}>
          {isAuthenticated ? 'Refresh' : 'Authorize'}
        </button>
      </header>
      {events.length === 0 && <div>No events loaded.</div>}
      <ul>
        {events.map((event, idx) => (
          <li key={event.id || idx}>
            <strong>{event.start?.dateTime || event.start?.date}</strong> -{' '}
            {event.summary || 'No title'}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
