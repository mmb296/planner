import React from 'react';

import { API_ENDPOINTS } from '../../config/api';
import TaskForm from './TaskForm';

const AddTask: React.FC<{ onTaskAdd: () => void }> = ({ onTaskAdd }) => {
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

  return <TaskForm onSubmit={handleTaskAdd} />;
};

export default AddTask;
