import React, { useState } from 'react';

import { API_ENDPOINTS } from '../../config/api';
import TaskForm from './TaskForm';

const AddTask: React.FC<{ onTaskAdd: () => void }> = ({ onTaskAdd }) => {
  const [key, setKey] = useState(0);

  const handleTaskAdd = async (title: string, repeatDays: number) => {
    await fetch(API_ENDPOINTS.TASKS, {
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

  const handleReset = () => {
    setKey((k) => k + 1);
  };

  return <TaskForm key={key} onReset={handleReset} onSubmit={handleTaskAdd} />;
};

export default AddTask;
