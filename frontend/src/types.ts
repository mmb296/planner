export type Calendar = {
  id: string;
  backgroundColor: string;
  summary: string;
  [key: string]: any;
};

export type CalendarEvent = {
  id: string;
  summary?: string;
  color?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  [key: string]: any;
};

export type Task = {
  id: number;
  title: string;
  repeat_days: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
};
