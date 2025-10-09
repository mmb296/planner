import React from 'react';

import { Task } from '../../types';
import TaskForm from './TaskForm';

type EditTaskProps = {
  task: Task;
  onTaskEdit: () => void;
};

const EditTask: React.FC<EditTaskProps> = ({ task, onTaskEdit }) => {
  const handleTaskEdit = async (title: string, repeatDays: number) => {
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

    onTaskEdit();
  };

  return <TaskForm task={task} onSubmit={handleTaskEdit} />;
};

export default EditTask;
