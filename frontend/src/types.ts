export type CalendarEvent = {
  id: string;
  summary?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  [key: string]: any;
};

export type EventsMap = Map<string, CalendarEvent[]>;
