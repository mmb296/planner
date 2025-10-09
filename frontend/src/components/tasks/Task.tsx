import React, { useState } from 'react';

import { Task } from '../../types';
import EditTask from './EditTask';
import styles from './Task.module.css';

type TaskProps = {
  task: Task;
  completed?: boolean;
  onTaskComplete: (taskId: number) => void;
  onTaskUpdate: () => void;
};

const TaskComponent: React.FC<TaskProps> = ({
  task,
  completed = false,
  onTaskComplete,
  onTaskUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onTaskComplete(task.id);
    }
  };

  const handleTitleClick = () => {
    setIsEditing(true);
  };

  const handleTaskUpdate = () => {
    setIsEditing(false);
    onTaskUpdate();
  };

  if (isEditing) {
    return (
      <li className={styles.taskItem}>
        <EditTask task={task} onEditComplete={handleTaskUpdate} />
      </li>
    );
  }

  return (
    <li className={styles.taskItem}>
      <input
        type="checkbox"
        checked={completed}
        onChange={handleCheckboxChange}
        className={styles.taskCheckbox}
      />
      <span
        style={{
          textDecoration: completed ? 'line-through' : 'none',
          opacity: completed ? 0.6 : 1
        }}
        className={styles.taskTitle}
        onClick={handleTitleClick}
      >
        {task.title}
      </span>
    </li>
  );
};

export default TaskComponent;
