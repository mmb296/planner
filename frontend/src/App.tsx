import './App.css';

import { useEffect, useRef, useState } from 'react';

import DaysSelect from './components/DaysSelect';
import EventList from './components/EventList';
import TaskList from './components/TaskList';
import { AuthenticationError, HttpError } from './errors';
import { CalendarEvent, Task, TaskCompletion } from './types';
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
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

  // Fetch tasks from backend API
  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/tasks');
      if (!response.ok) {
        throw new HttpError(
          `Failed to fetch tasks: ${response.statusText}`,
          response.status
        );
      }
      const tasksData = await response.json();
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setTasks([]);
    }
  };

  // Fetch latest completion for each task from backend API
  const fetchLatestCompletions = async () => {
    try {
      const response = await fetch(
        'http://localhost:5000/api/completions/latest'
      );
      if (!response.ok) {
        throw new HttpError(
          `Failed to fetch latest completions: ${response.statusText}`,
          response.status
        );
      }
      const completionsData = await response.json();
      setCompletions(completionsData);
    } catch (error) {
      console.error('Failed to fetch latest completions:', error);
      setCompletions([]);
    }
  };

  // Record a task completion
  const recordTaskCompletion = async (taskId: number) => {
    try {
      const response = await fetch('http://localhost:5000/api/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_id: taskId })
      });

      if (!response.ok) {
        throw new HttpError(
          `Failed to record completion: ${response.statusText}`,
          response.status
        );
      }

      // Refresh completions to get the latest data
      await fetchLatestCompletions();
    } catch (error) {
      console.error('Failed to record task completion:', error);
    }
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

  // Fetch tasks and latest completions on component mount
  useEffect(() => {
    fetchTasks();
    fetchLatestCompletions();
  }, []);

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
            <TaskList
              tasks={tasks}
              completions={completions}
              onTaskComplete={recordTaskCompletion}
            />
            <EventList events={filteredEvents} maxDays={days} />
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
