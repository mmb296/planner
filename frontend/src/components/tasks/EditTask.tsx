import React from 'react';

import { updateTask } from '../../services/taskApi';
import { Task } from '../../types';
import TaskForm from './TaskForm';

type EditTaskProps = {
  task: Task;
  onTaskEdit: () => void;
};

const EditTask: React.FC<EditTaskProps> = ({ task, onTaskEdit }) => {
  const handleTaskEdit = async (title: string, repeatDays: number) => {
    await updateTask(task.id, title, repeatDays);
    onTaskEdit();
  };

  return <TaskForm autoFocus onSubmit={handleTaskEdit} task={task} />;
};

export default EditTask;
