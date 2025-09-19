const sqlite3 = require('sqlite3');
const { promisify } = require('util');

// Create database connection
const db = new sqlite3.Database('./planner.db');

// Promisify database methods for async/await
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

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
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO recurring_tasks (title, repeat_days)
         VALUES (?, ?)`,
        [task.title, task.repeat_days],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ lastID: this.lastID, changes: this.changes });
          }
        }
      );
    });
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
