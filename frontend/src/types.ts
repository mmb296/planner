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

export type AppointmentSuggestion = {
  messageId: string;
  subject: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
};
