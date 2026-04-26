import type { OAuth2Client } from 'google-auth-library';

import { CalendarOAuthTokenDB, GmailOAuthTokenDB } from '../db/oauthStore.js';

/** Google token endpoint returns invalid_grant when refresh token is dead. */
export function isInvalidGrant(error: unknown): boolean {
  const e = error as {
    message?: string;
    response?: { data?: { error?: string; error_description?: string } };
  };
  if (e?.response?.data?.error === 'invalid_grant') return true;
  const msg = `${e?.message || ''} ${e?.response?.data?.error_description || ''}`;
  return msg.includes('invalid_grant');
}

export async function clearCalendarOAuthSession(
  oauth2Client: Pick<OAuth2Client, 'setCredentials'>
): Promise<void> {
  await CalendarOAuthTokenDB.clearToken();
  oauth2Client.setCredentials({});
}

export async function clearGmailOAuthSession(
  oauth2Client: Pick<OAuth2Client, 'setCredentials'>
): Promise<void> {
  await GmailOAuthTokenDB.clearToken();
  oauth2Client.setCredentials({});
}
