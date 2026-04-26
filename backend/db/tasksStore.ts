import { dbAll, dbGet, dbRun } from './connection.js';

export async function createTaskTables() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS recurring_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      repeat_days INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS task_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES recurring_tasks (id) ON DELETE CASCADE
    )
  `);
}

export const RecurringTaskDB = {
  async create(task: { title: string; repeat_days: number }) {
    return await dbRun(
      `INSERT INTO recurring_tasks (title, repeat_days)
         VALUES (?, ?)`,
      [task.title, task.repeat_days]
    );
  },

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

  async delete(id: number) {
    await dbRun('DELETE FROM recurring_tasks WHERE id = ?', [id]);
  }
};

export const TaskCompletionDB = {
  async create(taskId: number, completedAt?: string) {
    const timestamp = completedAt || new Date().toISOString();
    return await dbRun(
      'INSERT INTO task_completions (task_id, completed_at) VALUES (?, ?)',
      [taskId, timestamp]
    );
  },

  async delete(id: number) {
    await dbRun('DELETE FROM task_completions WHERE id = ?', [id]);
  },

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
