import React from 'react';

import { Task } from '../types';
import styles from './Task.module.css';

const TaskComponent: React.FC<{ task: Task }> = ({ task }) => {
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Implement task completion logic
    console.log(`Task ${task.id} completed:`, event.target.checked);
  };

  return (
    <li className={styles.taskItem}>
      <input
        type="checkbox"
        onChange={handleCheckboxChange}
        className={styles.taskCheckbox}
      />
      <span>{task.title}</span>
    </li>
  );
};

export default TaskComponent;
