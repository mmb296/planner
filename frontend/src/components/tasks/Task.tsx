import React from 'react';

import { Task } from '../../types';
import styles from './Task.module.css';

type TaskProps = {
  task: Task;
  completed?: boolean;
  onTaskComplete: (taskId: number) => void;
  onTaskDelete: (taskId: number) => void;
};

const TaskComponent: React.FC<TaskProps> = ({
  task,
  completed = false,
  onTaskComplete,
  onTaskDelete
}) => {
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onTaskComplete(task.id);
    }
  };

  const handleDelete = () => {
    onTaskDelete(task.id);
  };

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
      >
        {task.title}
      </span>
      <button
        onClick={handleDelete}
        className={styles.deleteButton}
        title="Delete task"
      >
        ×
      </button>
    </li>
  );
};

export default TaskComponent;
