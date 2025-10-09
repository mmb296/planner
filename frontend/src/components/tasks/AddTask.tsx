import React from 'react';

import { taskService } from '../../services/taskService';
import TaskForm from './TaskForm';

const AddTask: React.FC<{ onTaskUpdate: () => void }> = ({ onTaskUpdate }) => {
  const handleSubmit = async (title: string, repeatDays: number) => {
    await taskService.createTask(title, repeatDays);
    onTaskUpdate();
  };

  return <TaskForm onSubmit={handleSubmit} />;
};

export default AddTask;
