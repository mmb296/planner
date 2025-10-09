import React from 'react';

import TaskForm from './TaskForm';

const AddTask: React.FC<{ onTaskAdd: () => void }> = ({ onTaskAdd }) => {
  const handleTaskAdd = async (title: string, repeatDays: number) => {
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

    onTaskAdd();
  };

  return <TaskForm onSubmit={handleTaskAdd} />;
};

export default AddTask;
