import React from 'react';

import { Task } from '../types';
import TaskComponent from './Task';
import styles from './TaskList.module.css';

const TaskList: React.FC<{ tasks: Task[] }> = ({ tasks }) => (
  <div className={styles.taskList}>
    <h3 className={styles.taskListTitle}>Recurring Tasks</h3>
    <ul>
      {tasks.map((task) => (
        <TaskComponent key={task.id} task={task} />
      ))}
    </ul>
  </div>
);

export default TaskList;
