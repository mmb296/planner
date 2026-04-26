import type { OAuth2Client } from 'google-auth-library';

import { OAuthIntegration, OAuthTokenDB } from '../db/oauthStore.js';

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

export async function clearGoogleOAuthSession(
  oauth2Client: Pick<OAuth2Client, 'setCredentials'>,
  integration: OAuthIntegration
): Promise<void> {
  await OAuthTokenDB.clearToken(integration);
  oauth2Client.setCredentials({});
}
