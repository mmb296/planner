import { API_ENDPOINTS } from '../config/api';
import { AppointmentSuggestion } from '../types';
import { apiClient } from './apiClient';

export async function getSuggestions(): Promise<AppointmentSuggestion[]> {
  const data = await apiClient.get<{
    count: number;
    suggestions: AppointmentSuggestion[];
  }>(API_ENDPOINTS.GMAIL_SUGGESTIONS);
  return data.suggestions;
}

export async function acceptSuggestion(
  suggestion: AppointmentSuggestion
): Promise<void> {
  await apiClient.post(
    API_ENDPOINTS.GMAIL_SUGGESTION_ACCEPT(suggestion.messageId),
    {
      ...suggestion,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  );
}

export async function dismissSuggestion(messageId: string): Promise<void> {
  await apiClient.post(API_ENDPOINTS.GMAIL_SUGGESTION_DISMISS(messageId));
}
