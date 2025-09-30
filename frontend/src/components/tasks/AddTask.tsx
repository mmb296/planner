import React, { useState } from 'react';

import styles from './Task.module.css';

const AddTask: React.FC<{ onTaskAdded: () => void }> = ({ onTaskAdded }) => {
  const [title, setTitle] = useState('');

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
        repeat_days: 7
      })
    });

    if (response.ok) {
      // Reset form
      setTitle('');

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
    </form>
  );
};

export default AddTask;
