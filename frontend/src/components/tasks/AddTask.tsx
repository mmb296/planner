import React, { useState } from 'react';

import styles from './Task.module.css';

const AddTask: React.FC<{ onTaskAdded: () => void }> = ({ onTaskAdded }) => {
  const [title, setTitle] = useState('');
  const [repeatDays, setRepeatDays] = useState(7);

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
      setRepeatDays(7);

      // Notify parent component to refresh tasks
      onTaskAdded();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.taskItem}>
      <input type="checkbox" className={styles.taskCheckbox} />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New Task"
        className={styles.input}
      />
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
        placeholder="Days"
        className={styles.input}
        aria-label="Repeat every N days"
      />
      <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
    </form>
  );
};

export default AddTask;
