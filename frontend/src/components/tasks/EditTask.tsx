import React from 'react';

import { Task } from '../../types';
import TaskForm from './TaskForm';

type EditTaskProps = {
  task: Task;
  onEditComplete: () => void;
};

const EditTask: React.FC<EditTaskProps> = ({ task, onEditComplete }) => {
  const handleSubmit = async (title: string, repeatDays: number) => {
    await fetch(`${'http://localhost:5000/api/tasks'}/${task.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        repeat_days: repeatDays
      })
    });

    // Refresh task list and exit edit mode
    onEditComplete();
  };

  return <TaskForm task={task} onSubmit={handleSubmit} />;
};

export default EditTask;
