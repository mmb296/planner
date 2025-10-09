import React from 'react';

import TaskForm from './TaskForm';

const AddTask: React.FC = () => {
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
  };

  return <TaskForm onSubmit={handleSubmit} />;
};

export default AddTask;
