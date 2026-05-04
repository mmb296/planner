const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  TASKS: `${API_BASE_URL}/api/tasks`,
  TASK: (id: number) => `${API_BASE_URL}/api/tasks/${id}`,
  TASK_COMPLETE: (id: number) => `${API_BASE_URL}/api/tasks/${id}/complete`,
  TASK_UNCOMPLETE: (id: number) => `${API_BASE_URL}/api/tasks/${id}/uncomplete`,
  PERIOD_DAYS_TOGGLE: `${API_BASE_URL}/api/period-days/toggle`,
  PERIOD_DAYS_RANGE: `${API_BASE_URL}/api/period-days/range`,
  PERIOD_DAYS_PREDICTION: `${API_BASE_URL}/api/period-days/prediction`,
  COUNTDOWN: `${API_BASE_URL}/api/countdown`,
  CALENDAR_AUTH_START: `${API_BASE_URL}/auth/google/calendar`,
  CALENDAR_STATUS: `${API_BASE_URL}/api/calendar/status`,
  CALENDAR_LIST: `${API_BASE_URL}/api/calendar/calendars`,
  CALENDAR_EVENTS: `${API_BASE_URL}/api/calendar/events`,
  CALENDAR_EVENTS_STREAM: `${API_BASE_URL}/api/calendar/stream`,
  CALENDAR_DISCONNECT: `${API_BASE_URL}/api/calendar/auth`,
  GMAIL_SUGGESTIONS: `${API_BASE_URL}/api/ai/appointments/suggestions`,
  GMAIL_SUGGESTION_ACCEPT: (messageId: string) =>
    `${API_BASE_URL}/api/gmail/messages/${messageId}/accept`,
  GMAIL_SUGGESTION_DISMISS: (messageId: string) =>
    `${API_BASE_URL}/api/gmail/messages/${messageId}/dismiss`
};
