import React, { createContext, useContext, useReducer } from 'react';

import { useCalendarAuth } from '../hooks/useCalendarAuth';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useCalendars } from '../hooks/useCalendars';
import { Calendar, CalendarEvent } from '../types';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

export type CalendarState = {
  status: AuthStatus;
  calendars: Calendar[];
  selectedCalendarIds: Set<string>;
  allEvents: CalendarEvent[];
  numDays: number;
};

export type CalendarAction =
  | { type: 'CLEAR_AUTH' }
  | { type: 'SET_STATUS'; status: AuthStatus }
  | { type: 'SET_CALENDARS'; calendars: Calendar[] }
  | { type: 'TOGGLE_CALENDAR'; id: string; checked: boolean }
  | { type: 'SET_EVENTS'; events: CalendarEvent[] }
  | { type: 'SET_NUM_DAYS'; numDays: number };

const initialState: CalendarState = {
  status: 'loading',
  calendars: [],
  selectedCalendarIds: new Set(),
  allEvents: [],
  numDays: 14
};

function calendarReducer(
  state: CalendarState,
  action: CalendarAction
): CalendarState {
  switch (action.type) {
    case 'CLEAR_AUTH':
      return {
        ...state,
        status: 'unauthenticated',
        calendars: [],
        selectedCalendarIds: new Set(),
        allEvents: []
      };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SET_CALENDARS':
      return {
        ...state,
        calendars: action.calendars,
        selectedCalendarIds: new Set(action.calendars.map((c) => c.id))
      };
    case 'TOGGLE_CALENDAR': {
      const next = new Set(state.selectedCalendarIds);
      if (action.checked) next.add(action.id);
      else next.delete(action.id);
      return { ...state, selectedCalendarIds: next };
    }
    case 'SET_EVENTS':
      return { ...state, allEvents: action.events };
    case 'SET_NUM_DAYS':
      return { ...state, numDays: action.numDays };
  }
}

type CalendarContextValue = {
  state: CalendarState;
  dispatch: React.Dispatch<CalendarAction>;
};

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(calendarReducer, initialState);
  const isAuthenticated = state.status === 'authenticated';

  useCalendarAuth(dispatch);
  useCalendars(isAuthenticated, dispatch);
  useCalendarEvents(isAuthenticated, state.calendars, state.numDays, dispatch);

  return (
    <CalendarContext.Provider value={{ state, dispatch }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (!context)
    throw new Error('useCalendarContext must be used within CalendarProvider');
  return context;
}
