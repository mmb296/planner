import React, { useState } from 'react';

import { Task } from '../../types';
import styles from './Task.module.css';

type TaskProps = {
  task?: Task;
  completed?: boolean;
  onTaskChange: () => void;
  onTaskComplete?: (taskId: number) => void;
};

const TaskComponent: React.FC<TaskProps> = ({
  task,
  completed = false,
  onTaskChange,
  onTaskComplete
}) => {
  const [isEditing, setIsEditing] = useState(!task); // New tasks start in edit mode
  const [title, setTitle] = useState(task?.title || '');
  const [repeatDays, setRepeatDays] = useState(task?.repeat_days || 7);

  const normalizeRepeatDays = (raw: number): number => {
    return Math.max(1, isNaN(raw) ? 1 : Math.floor(raw));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const response = await fetch('http://localhost:5000/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...(task && { id: task.id }), // Include id for updates
        title: trimmedTitle,
        repeat_days: normalizeRepeatDays(repeatDays)
      })
    });

    if (response.ok) {
      // Reset form
      setTitle('');
      setRepeatDays(7);
      setIsEditing(false);

      // Notify parent component to refresh tasks
      onTaskChange();
    }
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked && onTaskComplete && task) {
      onTaskComplete(task.id);
    }
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className={styles.taskInput}>
        <input type="checkbox" className={styles.taskCheckbox} />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New Task"
          className={`${styles.input} ${styles.titleInput}`}
        />
        <label className={styles.repeatDaysLabel}>Days:</label>
        <input
          type="number"
          min={1}
          step={1}
          value={Number.isNaN(repeatDays) ? '' : repeatDays}
          onChange={(e) => setRepeatDays(e.target.valueAsNumber)}
          onBlur={(e) => {
            setRepeatDays(normalizeRepeatDays(e.target.valueAsNumber));
          }}
          className={`${styles.input} ${styles.repeatDaysInput}`}
          aria-label="Repeat every N days"
        />
        <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
      </form>
    );
  }

  // Display mode for existing tasks
  return (
    <li className={styles.taskItem}>
      <input
        type="checkbox"
        checked={completed}
        onChange={handleCheckboxChange}
        className={styles.taskCheckbox}
      />
      <span
        onClick={() => setIsEditing(true)}
        style={{
          textDecoration: completed ? 'line-through' : 'none',
          opacity: completed ? 0.6 : 1
        }}
      >
        {task?.title}
      </span>
    </li>
  );
};

export default TaskComponent;
