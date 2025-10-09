import React from 'react';

import { taskService } from '../../services/taskService';
import { Task } from '../../types';
import TaskForm from './TaskForm';

type EditTaskProps = {
  task: Task;
  onEditComplete: () => void;
};

const EditTask: React.FC<EditTaskProps> = ({ task, onEditComplete }) => {
  const handleSubmit = async (title: string, repeatDays: number) => {
    await taskService.updateTask(task.id, title, repeatDays);
    onEditComplete();
  };

  return <TaskForm task={task} onSubmit={handleSubmit} />;
};

export default EditTask;
