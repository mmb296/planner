import React, { useState } from 'react';

import { API_ENDPOINTS } from '../../config/api';
import { apiClient } from '../../services/apiClient';
import TaskForm from './TaskForm';

const AddTask: React.FC<{ onTaskAdd: () => void }> = ({ onTaskAdd }) => {
  const [key, setKey] = useState(0);

  const handleTaskAdd = async (title: string, repeatDays: number) => {
    await apiClient.post(API_ENDPOINTS.TASKS, {
      title,
      repeat_days: repeatDays
    });
    onTaskAdd();
  };

  const handleReset = () => {
    setKey((k) => k + 1);
  };

  return (
    <div style={{ padding: '8px var(--horizontal-padding)' }}>
      <TaskForm key={key} onReset={handleReset} onSubmit={handleTaskAdd} />
    </div>
  );
};

export default AddTask;
