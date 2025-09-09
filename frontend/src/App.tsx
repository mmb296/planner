import './App.css';

import React, { useEffect, useRef, useState } from 'react';

import { CalendarEvent, EventsMap } from './types';
import { daysFromNow, formatTime, getTodayDate } from './utils/dateTime';

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

function groupEvents(events: CalendarEvent[]): EventsMap {
  const groupedEvents: EventsMap = new Map();

  events.forEach((event) => {
    const start = event.start.dateTime || event.start.date;
    const eventDate = new Date(start as string);
    const diffDays = daysFromNow(eventDate);

    let dayLabel: string;
    if (diffDays === 0) dayLabel = 'TODAY';
    else if (diffDays === 1) dayLabel = 'TOMORROW';
    else dayLabel = `${diffDays} DAYS`;

    if (!groupedEvents.has(dayLabel)) groupedEvents.set(dayLabel, []);
    groupedEvents.get(dayLabel)!.push(event);
  });

  return groupedEvents;
}

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
    initTokenClient().requestAccessToken();
  };

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
        setEventsByDay(groupEvents(data.items));
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

  function getDotColor(event: CalendarEvent): string {
    if (!event.start.dateTime) return '#f4d9e8'; // All Day

    const hour = new Date(event.start.dateTime).getHours();
    if (hour < 12) return '#d9e2f2'; // Morning
    if (hour < 17) return '#f8e9bd'; // Afternoon
    return '#cec8f7'; // Night
  }

  return (
    <div className="App">
      <header className="App-header">
        {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </header>
      {eventsByDay.size === 0 && <div>No events loaded.</div>}
      <ul className="event-list">
        {Array.from(eventsByDay.entries()).map(([dayLabel, events]) => (
          <li key={dayLabel}>
            <div className="day-header">{dayLabel}</div>
            <ul>
              {events.map((event, idx) => (
                <li key={event.id || idx}>
                  <span
                    className="event-dot"
                    style={{ backgroundColor: getDotColor(event) }}
                  />
                  <span className="event-time">
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
      <button onClick={handleAuthClick}>
        {isAuthenticated ? 'Refresh' : 'Authorize'}
      </button>
    </div>
  );
}

export default App;
