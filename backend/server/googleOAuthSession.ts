import type { Response } from 'express';
import type { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

import { CalendarOAuthTokenDB, GmailOAuthTokenDB } from '../db/oauthStore.js';

import type { calendar_v3, gmail_v1 } from 'googleapis';

export function isInvalidGrant(error: unknown): boolean {
  const e = error as {
    message?: string;
    response?: { data?: { error?: string; error_description?: string } };
  };
  if (e?.response?.data?.error === 'invalid_grant') return true;
  const msg = `${e?.message || ''} ${e?.response?.data?.error_description || ''}`;
  return msg.includes('invalid_grant');
}

abstract class GoogleOAuthSession {
  constructor(public readonly client: OAuth2Client) {}

  protected abstract clearToken(): Promise<void>;
  protected abstract readonly revokedMessage: string;

  isConnected(): boolean {
    const { credentials } = this.client;
    return !!(credentials.refresh_token || credentials.access_token);
  }

  async clearSession(): Promise<void> {
    await this.clearToken();
    this.client.setCredentials({});
  }

  async clearIfInvalidGrant(error: unknown): Promise<boolean> {
    if (!isInvalidGrant(error)) return false;
    await this.clearSession();
    return true;
  }

  async rejectIfInvalidGrant(error: unknown, res: Response): Promise<boolean> {
    if (!(await this.clearIfInvalidGrant(error))) return false;
    res.status(401).json({ error: this.revokedMessage });
    return true;
  }
}

export class GmailOAuthSession extends GoogleOAuthSession {
  protected readonly revokedMessage =
    'Gmail access expired or was revoked. Sign in with Google again.';
  protected clearToken() {
    return GmailOAuthTokenDB.clearToken();
  }

  getGmailClient(): gmail_v1.Gmail | null {
    if (!this.isConnected()) return null;
    return google.gmail({ version: 'v1', auth: this.client });
  }
}

export class CalendarOAuthSession extends GoogleOAuthSession {
  protected readonly revokedMessage =
    'Calendar access expired or was revoked. Sign in with Google Calendar again.';
  protected clearToken() {
    return CalendarOAuthTokenDB.clearToken();
  }

  getCalendarClient(): calendar_v3.Calendar | null {
    if (!this.isConnected()) return null;
    return google.calendar({ version: 'v3', auth: this.client });
  }
}
