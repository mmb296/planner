import React, { useState } from 'react';

import { Task } from '../../types';
import styles from './Task.module.css';

type EditTaskProps = {
  task?: Task;
  onTaskSaved: () => void;
};

const EditTask: React.FC<EditTaskProps> = ({ task, onTaskSaved }) => {
  const [title, setTitle] = useState(task?.title || '');
  const [repeatDays, setRepeatDays] = useState(task?.repeat_days || 7);
  const [isActive, setIsActive] = useState(!!task); // Active by default if editing

  const normalizeRepeatDays = (raw: number): number => {
    return Math.max(1, isNaN(raw) ? 1 : Math.floor(raw));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents page refresh

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const url = task
      ? `http://localhost:5000/api/tasks/${task.id}`
      : 'http://localhost:5000/api/tasks';

    const method = task ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: trimmedTitle,
        repeat_days: normalizeRepeatDays(repeatDays)
      })
    });

    if (response.ok) {
      // Reset form when creating new tasks
      if (!task) {
        setTitle('');
        setIsActive(false);
        setRepeatDays(7);
      }

      // Notify parent component to refresh tasks
      onTaskSaved();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.taskInput}>
      <input type="checkbox" className={styles.taskCheckbox} />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setIsActive(true)}
        onBlur={() => {
          if (!title.trim()) {
            setIsActive(false);
            setRepeatDays(7);
          }
        }}
        placeholder="New Task"
        className={`${styles.input} ${styles.titleInput}`}
        autoFocus={!!task} // Auto-focus when editing
      />
      {isActive && (
        <>
          <label className={styles.repeatDaysLabel}>Days:</label>
          <input
            type="number"
            min={1}
            step={1}
            value={Number.isNaN(repeatDays) ? '' : repeatDays}
            onChange={(e) => {
              setRepeatDays(e.target.valueAsNumber);
            }}
            onBlur={(e) => {
              setRepeatDays(normalizeRepeatDays(e.target.valueAsNumber));
            }}
            className={`${styles.input} ${styles.repeatDaysInput}`}
            aria-label="Repeat every N days"
          />
        </>
      )}
      <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
    </form>
  );
};

export default EditTask;
