import { dbAll, dbGet, dbRun } from './connection.js';

// Initialize database with tables
export async function initDatabase() {
  try {
    // Create recurring_tasks table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS recurring_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        repeat_days INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create task_completions table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS task_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES recurring_tasks (id) ON DELETE CASCADE
      )
    `);

    // Create gmail_messages table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS gmail_messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT,
        subject TEXT,
        from_address TEXT,
        snippet TEXT,
        internal_date_ms INTEGER,
        body_text TEXT,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index to speed up MAX(internal_date_ms)
    await dbRun(`
      CREATE INDEX IF NOT EXISTS idx_gmail_messages_internal_date
      ON gmail_messages (internal_date_ms)
    `);

    // Create oauth_token table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS oauth_token (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        access_token TEXT,
        refresh_token TEXT,
        scope TEXT,
        token_type TEXT,
        expiry_date INTEGER,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create countdown_config table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS countdown_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        target_date TEXT NOT NULL,
        title TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Recurring Task operations
export const RecurringTaskDB = {
  // Create a new recurring task
  async create(task: { title: string; repeat_days: number }) {
    return await dbRun(
      `INSERT INTO recurring_tasks (title, repeat_days)
       VALUES (?, ?)`,
      [task.title, task.repeat_days]
    );
  },

  // Get all recurring tasks
  async getAll() {
    return await dbAll(`
      SELECT 
        rt.id,
        rt.title,
        rt.repeat_days,
        rt.created_at,
        rt.updated_at,
        MAX(tc.completed_at) as completed_at
      FROM recurring_tasks rt
      LEFT JOIN task_completions tc ON rt.id = tc.task_id
      GROUP BY rt.id, rt.title, rt.repeat_days, rt.created_at, rt.updated_at
      ORDER BY rt.title
    `);
  },

  // Get a specific recurring task by ID
  async getById(id: number) {
    return await dbGet(
      `
      SELECT 
        rt.id,
        rt.title,
        rt.repeat_days,
        rt.created_at,
        rt.updated_at,
        MAX(tc.completed_at) as completed_at
      FROM recurring_tasks rt
      LEFT JOIN task_completions tc ON rt.id = tc.task_id
      WHERE rt.id = ?
      GROUP BY rt.id, rt.title, rt.repeat_days, rt.created_at, rt.updated_at
    `,
      [id]
    );
  },

  // Update recurring task
  async update(
    id: number,
    task: {
      title?: string;
      repeat_days?: number;
    }
  ) {
    const fields = [];
    const values = [];

    if (task.title !== undefined) {
      fields.push('title = ?');
      values.push(task.title);
    }
    if (task.repeat_days !== undefined) {
      fields.push('repeat_days = ?');
      values.push(task.repeat_days);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await dbRun(
      `UPDATE recurring_tasks SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  },

  // Delete recurring task
  async delete(id: number) {
    await dbRun('DELETE FROM recurring_tasks WHERE id = ?', [id]);
  }
};

// Task Completion operations
export const TaskCompletionDB = {
  // Create a new task completion
  async create(taskId: number, completedAt?: string) {
    const timestamp = completedAt || new Date().toISOString();
    return await dbRun(
      'INSERT INTO task_completions (task_id, completed_at) VALUES (?, ?)',
      [taskId, timestamp]
    );
  },

  // Delete a specific completion
  async delete(id: number) {
    await dbRun('DELETE FROM task_completions WHERE id = ?', [id]);
  },

  // Delete the most recent completion for a task
  async deleteLatestByTaskId(taskId: number) {
    await dbRun(
      `DELETE FROM task_completions 
       WHERE id = (
         SELECT id FROM task_completions 
         WHERE task_id = ? 
         ORDER BY completed_at DESC 
         LIMIT 1
       )`,
      [taskId]
    );
  }
};

// Gmail operations
export const GmailDB = {
  async upsertMessage(message: {
    id: string;
    thread_id?: string;
    subject?: string;
    from_address?: string;
    snippet?: string;
    internal_date_ms?: number;
    body_text?: string;
  }) {
    await dbRun(
      `INSERT INTO gmail_messages (id, thread_id, subject, from_address, snippet, internal_date_ms, body_text)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         thread_id=excluded.thread_id,
         subject=excluded.subject,
         from_address=excluded.from_address,
         snippet=excluded.snippet,
         internal_date_ms=excluded.internal_date_ms,
         body_text=excluded.body_text`,
      [
        message.id,
        message.thread_id || null,
        message.subject || null,
        message.from_address || null,
        message.snippet || null,
        message.internal_date_ms || null,
        message.body_text || null
      ]
    );
  },

  async getMaxInternalDateMs(): Promise<number> {
    const row: any = await dbGet(
      `SELECT COALESCE(MAX(internal_date_ms), 0) AS maxVal FROM gmail_messages`
    );
    return Number(row?.maxVal || 0);
  },

  async getMessagesWithBody(limit?: number): Promise<any[]> {
    const query = `
      SELECT id, thread_id, subject, from_address, snippet, internal_date_ms, body_text
      FROM gmail_messages
      WHERE body_text IS NOT NULL AND body_text <> ''
      ORDER BY internal_date_ms DESC
      ${limit ? 'LIMIT ?' : ''}
    `;

    const params = limit ? [limit] : [];
    const rows = await dbAll(query, params);
    return rows as any[];
  },

  async getMessageById(id: string): Promise<any | null> {
    const row = await dbGet(
      `SELECT id, thread_id, subject, from_address, snippet, internal_date_ms, body_text
       FROM gmail_messages
       WHERE id = ?`,
      [id]
    );
    return row || null;
  }
};

// OAuth Token operations
export const OAuthTokenDB = {
  async saveToken(tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    scope?: string | string[] | null;
    token_type?: string | null;
    expiry_date?: number | null;
  }) {
    const scope = Array.isArray(tokens.scope)
      ? tokens.scope.join(' ')
      : tokens.scope || null;

    await dbRun(
      `INSERT INTO oauth_token (id, access_token, refresh_token, scope, token_type, expiry_date)
       VALUES (1, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         access_token=excluded.access_token,
         refresh_token=COALESCE(excluded.refresh_token, oauth_token.refresh_token),
         scope=excluded.scope,
         token_type=excluded.token_type,
         expiry_date=excluded.expiry_date,
         updated_at=CURRENT_TIMESTAMP`,
      [
        tokens.access_token || null,
        tokens.refresh_token || null,
        scope,
        tokens.token_type || null,
        tokens.expiry_date || null
      ]
    );
  },

  async getToken(): Promise<{
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
    expiry_date?: number;
  } | null> {
    const row: any = await dbGet('SELECT * FROM oauth_token WHERE id = 1');
    if (!row) return null;

    return {
      access_token: row.access_token || undefined,
      refresh_token: row.refresh_token || undefined,
      scope: row.scope || undefined,
      token_type: row.token_type || undefined,
      expiry_date: row.expiry_date || undefined
    };
  }
};

// Countdown Config operations
export const CountdownConfigDB = {
  async get(): Promise<{ target_date: string; title?: string } | null> {
    const row: any = await dbGet(
      'SELECT target_date, title FROM countdown_config WHERE id = 1'
    );
    if (!row) return null;
    return {
      target_date: row.target_date,
      title: row.title || undefined
    };
  },

  async set(targetDate: string, title?: string): Promise<void> {
    await dbRun(
      `INSERT INTO countdown_config (id, target_date, title)
       VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         target_date=excluded.target_date,
         title=excluded.title,
         updated_at=CURRENT_TIMESTAMP`,
      [targetDate, title || null]
    );
  }
};
