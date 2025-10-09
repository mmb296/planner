import React from 'react';

import { API_ENDPOINTS } from '../../config/api';
import { Task } from '../../types';
import TaskForm from './TaskForm';

type EditTaskProps = {
  task: Task;
  onTaskEdit: () => void;
};

const EditTask: React.FC<EditTaskProps> = ({ task, onTaskEdit }) => {
  const handleTaskEdit = async (title: string, repeatDays: number) => {
    await fetch(API_ENDPOINTS.TASK(task.id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        repeat_days: repeatDays
      })
    });

    onTaskEdit();
  };

  return <TaskForm task={task} onSubmit={handleTaskEdit} autoFocus />;
};

export default EditTask;
