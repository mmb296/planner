import React, { useState } from 'react';

import { Task } from '../../types';
import EditTask from './EditTask';
import styles from './Task.module.css';

type TaskProps = {
  task: Task;
  completed?: boolean;
  onTaskComplete: (taskId: number) => void;
  onTaskUpdated: () => void;
};

const TaskComponent: React.FC<TaskProps> = ({
  task,
  completed = false,
  onTaskComplete,
  onTaskUpdated
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

  const handleSave = () => {
    setIsEditing(false);
    onTaskUpdated();
  };

  if (isEditing) {
    return (
      <li className={styles.taskItem}>
        <EditTask task={task} onTaskSaved={handleSave} />
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
