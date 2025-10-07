import React, { useState } from 'react';

import styles from './Task.module.css';

const EditTask: React.FC<{ onTaskAdded: () => void }> = ({ onTaskAdded }) => {
  const [title, setTitle] = useState('');
  const [repeatDays, setRepeatDays] = useState(7);
  const [isActive, setIsActive] = useState(false);

  const normalizeRepeatDays = (raw: number): number => {
    return Math.max(1, isNaN(raw) ? 1 : Math.floor(raw));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents page refresh

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const response = await fetch('http://localhost:5000/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: trimmedTitle,
        repeat_days: normalizeRepeatDays(repeatDays)
      })
    });

    if (response.ok) {
      // Reset form
      setTitle('');
      setIsActive(false);
      setRepeatDays(7);

      // Notify parent component to refresh tasks
      onTaskAdded();
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
