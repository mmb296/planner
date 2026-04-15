import React from 'react';

import { API_ENDPOINTS } from '../../config/api';
import { apiClient } from '../../services/apiClient';
import { Task } from '../../types';
import TaskForm from './TaskForm';

type EditTaskProps = {
  task: Task;
  onTaskEdit: () => void;
};

const EditTask: React.FC<EditTaskProps> = ({ task, onTaskEdit }) => {
  const handleTaskEdit = async (title: string, repeatDays: number) => {
    await apiClient.put(API_ENDPOINTS.TASK(task.id), {
      title,
      repeat_days: repeatDays
    });
    onTaskEdit();
  };

  return <TaskForm autoFocus onSubmit={handleTaskEdit} task={task} />;
};

export default EditTask;
