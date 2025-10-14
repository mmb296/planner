import React, { useState } from 'react';

import { Task } from '../../types';
import styles from './Task.module.css';

type TaskFormProps = {
  autoFocus?: boolean;
  onReset?: () => void;
  onSubmit: (title: string, repeatDays: number) => Promise<void>;
  task?: Task;
};

const TaskForm: React.FC<TaskFormProps> = ({
  autoFocus = false,
  onReset,
  onSubmit,
  task
}) => {
  const [title, setTitle] = useState(task?.title || '');
  const [repeatDays, setRepeatDays] = useState(task?.repeat_days || 7);
  const [isActive, setIsActive] = useState(!!task);

  const normalizeRepeatDays = (raw: number): number => {
    return Math.max(1, isNaN(raw) ? 1 : Math.floor(raw));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents page refresh

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    await onSubmit(trimmedTitle, normalizeRepeatDays(repeatDays));
    onReset?.();
  };

  const handleTitleBlur = () => {
    if (!title.trim()) {
      onReset?.();
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
        onBlur={handleTitleBlur}
        placeholder={'New Task'}
        className={`${styles.input} ${styles.titleInput}`}
        autoFocus={autoFocus}
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

export default TaskForm;
