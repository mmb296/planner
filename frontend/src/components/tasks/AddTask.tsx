import React from 'react';

import TaskForm from './TaskForm';

const AddTask: React.FC<{ onTaskUpdate: () => void }> = ({ onTaskUpdate }) => {
  const handleSubmit = async (title: string, repeatDays: number) => {
    await fetch('http://localhost:5000/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        repeat_days: repeatDays
      })
    });

    // Refresh task list
    onTaskUpdate();
  };

  return <TaskForm onSubmit={handleSubmit} />;
};

export default AddTask;
