const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  CALENDAR_AUTH_START: `${API_BASE_URL}/auth/google/calendar`,
  CALENDAR_STATUS: `${API_BASE_URL}/api/calendar/status`,
  CALENDAR_LIST: `${API_BASE_URL}/api/calendar/calendars`,
  CALENDAR_EVENTS: `${API_BASE_URL}/api/calendar/events`,
  CALENDAR_EVENTS_STREAM: `${API_BASE_URL}/api/calendar/stream`,
  CALENDAR_DISCONNECT: `${API_BASE_URL}/api/calendar/auth`,
  GMAIL_SUGGESTIONS: `${API_BASE_URL}/api/ai/appointments/suggestions`,
  GMAIL_STREAM: `${API_BASE_URL}/api/gmail/stream`,
  GMAIL_SUGGESTION_ACCEPT: (messageId: string) =>
    `${API_BASE_URL}/api/gmail/messages/${messageId}/accept`,
  GMAIL_SUGGESTION_DISMISS: (messageId: string) =>
    `${API_BASE_URL}/api/gmail/messages/${messageId}/dismiss`
};
