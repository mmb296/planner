import React, { useState } from 'react';

import { createTask } from '../../services/taskApi';
import TaskForm from './TaskForm';

const AddTask: React.FC<{ onTaskAdd: () => void }> = ({ onTaskAdd }) => {
  const [key, setKey] = useState(0);

  const handleTaskAdd = async (title: string, repeatDays: number) => {
    await createTask(title, repeatDays);
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
