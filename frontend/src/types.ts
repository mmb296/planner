export type Calendar = {
  id: string;
  backgroundColor: string;
  summary: string;
};

export type CalendarEvent = {
  id: string;
  calendarId: string;
  summary?: string;
  color?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
};

export type Task = {
  id: number;
  title: string;
  repeat_days: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
};
