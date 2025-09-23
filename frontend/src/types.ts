export type CalendarEvent = {
  id: string;
  summary?: string;
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
};

export type TaskCompletion = {
  id: number;
  task_id: number;
  completed_at: string;
};
