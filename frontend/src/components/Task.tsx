import React from 'react';

import { Task } from '../types';
import styles from './Task.module.css';

const TaskComponent: React.FC<{ task: Task }> = ({ task }) => {
  return (
    <li className={styles.taskItem}>
      <span className={styles.taskDot} />
      <span>{task.title}</span>
    </li>
  );
};

export default TaskComponent;
