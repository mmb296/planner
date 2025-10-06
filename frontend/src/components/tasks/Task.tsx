import React from 'react';

import { Task } from '../../types';
import styles from './Task.module.css';

type TaskProps = {
  task: Task;
  completed?: boolean;
  onTaskComplete: (taskId: number) => void;
};

const TaskComponent: React.FC<TaskProps> = ({
  task,
  completed = false,
  onTaskComplete
}) => {
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onTaskComplete(task.id);
    }
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
      >
        {task.title}
      </span>
    </li>
  );
};

export default TaskComponent;
