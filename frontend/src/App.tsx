import React, { useEffect, useRef, useState } from 'react';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import './App.css';
import { getTodayDate } from './utils/dateTime';

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

type EventsMap = Map<number, CalendarEvent[]>;

function App() {
  const clientId = process.env.REACT_APP_CLIENT_ID as string;

  const tokenClient = useRef<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!sessionStorage.getItem('access_token')
  );
  const [eventsByDay, setEventsByDay] = useState<EventsMap>(new Map());

  const initTokenClient = () => {
    if (tokenClient.current) return tokenClient.current;
    tokenClient.current = (
      window as any
    ).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error !== undefined) {
          setEventsByDay(new Map());
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

  // Helper to group events
  function groupEvents(events: CalendarEvent[]) {
    const groupedEvents: EventsMap = new Map();

    events.forEach((event) => {
      const start = event.start.dateTime || event.start.date;
      const eventDate = new Date(start as string);
      const diffDays = Math.floor(
        (eventDate.getTime() - getTodayDate().getTime()) / (1000 * 60 * 60 * 24)
      );

      if (!groupedEvents.get(diffDays)) groupedEvents.set(diffDays, []);
      (groupedEvents.get(diffDays) as CalendarEvent[]).push(event);
    });

    return groupedEvents;
  }

  const listUpcomingEvents = async (token: string) => {
    const url = new URL(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    );
    const todayDate = getTodayDate();

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
      if (data.items) {
        const groupedEvents = groupEvents(data.items);
        setEventsByDay(groupedEvents);
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

  // Helper to format time
  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="App">
      <header className="App-header">
        <CalendarMonth className="App-logo" style={{ fontSize: 200 }} />
        <button onClick={handleAuthClick}>
          {isAuthenticated ? 'Refresh' : 'Authorize'}
        </button>
      </header>
      {eventsByDay.size === 0 && <div>No events loaded.</div>}
      <ul>
        {Array.from(eventsByDay.entries()).map(([dayLabel, events]) => (
          <li key={dayLabel}>
            <div>{dayLabel}</div>
            <ul>
              {events.map((event: CalendarEvent, idx: number) => (
                <li key={event.id || idx}>
                  <span>
                    {event.start.dateTime
                      ? formatTime(event.start.dateTime)
                      : 'All Day'}
                  </span>
                  <span> - {event.summary}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
