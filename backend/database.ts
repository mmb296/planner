import sqlite3 from 'sqlite3';

// Types
type DbResult = {
  lastID: number;
  changes: number;
};

// Create database connection
const db = new sqlite3.Database('./planner.db');

// Promisify database methods for async/await
const dbGet = (sql: string, params: any[] = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql: string, params: any[] = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (sql: string, params: any[] = []): Promise<DbResult> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

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
    return await dbAll('SELECT * FROM recurring_tasks ORDER BY title');
  },

  // Get recurring task by ID
  async getById(id: number) {
    return await dbGet('SELECT * FROM recurring_tasks WHERE id = ?', [id]);
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
  async create(taskId: number) {
    return await dbRun('INSERT INTO task_completions (task_id) VALUES (?)', [
      taskId
    ]);
  },

  // Get latest completion for each task
  async getLatestForEachTask() {
    return await dbAll(`
      SELECT 
        tc.id,
        tc.task_id,
        tc.completed_at
      FROM task_completions tc
      INNER JOIN (
        SELECT task_id, MAX(completed_at) as latest_completion
        FROM task_completions
        GROUP BY task_id
      ) latest ON tc.task_id = latest.task_id AND tc.completed_at = latest.latest_completion
    `);
  },

  // Delete a specific completion
  async delete(id: number) {
    await dbRun('DELETE FROM task_completions WHERE id = ?', [id]);
  }
};

// Close database connection
export function closeDatabase() {
  return new Promise<void>((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Database connection closed');
        resolve();
      }
    });
  });
}
