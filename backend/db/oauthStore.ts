import { dbGet, dbRun } from './connection.js';

export type OAuthIntegration = 'gmail' | 'calendar';

export type OAuthToken = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
};

export type OAuthTokenInput = {
  [K in keyof OAuthToken]?: OAuthToken[K] | null;
} & {
  // Google may send array; DB stores string
  scope?: string | string[] | null;
};

export async function createOauthTable() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      integration TEXT PRIMARY KEY CHECK (integration IN ('gmail', 'calendar')),
      access_token TEXT,
      refresh_token TEXT,
      scope TEXT,
      token_type TEXT,
      expiry_date INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function makeOAuthTokenDB(integration: OAuthIntegration) {
  return {
    async saveToken(tokens: OAuthTokenInput) {
      return OAuthTokenDB.saveToken(integration, tokens);
    },
    async getToken(): Promise<OAuthToken | null> {
      return OAuthTokenDB.getToken(integration);
    },
    async clearToken(): Promise<void> {
      return OAuthTokenDB.clearToken(integration);
    }
  };
}

export const CalendarOAuthTokenDB = makeOAuthTokenDB('calendar');
export const GmailOAuthTokenDB = makeOAuthTokenDB('gmail');

// Google OAuth tokens: one row per integration (Gmail, Calendar)
export const OAuthTokenDB = {
  async saveToken(integration: OAuthIntegration, tokens: OAuthTokenInput) {
    const scope = Array.isArray(tokens.scope)
      ? tokens.scope.join(' ')
      : tokens.scope || null;

    await dbRun(
      `INSERT INTO oauth_tokens (integration, access_token, refresh_token, scope, token_type, expiry_date)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(integration) DO UPDATE SET
           access_token=excluded.access_token,
           refresh_token=COALESCE(excluded.refresh_token, oauth_tokens.refresh_token),
           scope=excluded.scope,
           token_type=excluded.token_type,
           expiry_date=excluded.expiry_date,
           updated_at=CURRENT_TIMESTAMP`,
      [
        integration,
        tokens.access_token || null,
        tokens.refresh_token || null,
        scope,
        tokens.token_type || null,
        tokens.expiry_date || null
      ]
    );
  },

  async getToken(integration: OAuthIntegration): Promise<OAuthToken | null> {
    const row = await dbGet<OAuthToken>(
      'SELECT * FROM oauth_tokens WHERE integration = ?',
      [integration]
    );
    if (!row) return null;

    return {
      access_token: row.access_token || undefined,
      refresh_token: row.refresh_token || undefined,
      scope: row.scope || undefined,
      token_type: row.token_type || undefined,
      expiry_date: row.expiry_date || undefined
    };
  },

  async clearToken(integration: OAuthIntegration): Promise<void> {
    await dbRun('DELETE FROM oauth_tokens WHERE integration = ?', [
      integration
    ]);
  }
};
