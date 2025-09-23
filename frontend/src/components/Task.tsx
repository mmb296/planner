import React from 'react';

import { Task, TaskCompletion } from '../types';
import styles from './Task.module.css';

type TaskProps = {
  task: Task;
  completions: TaskCompletion[];
  onTaskComplete: (taskId: number) => void;
};

const TaskComponent: React.FC<TaskProps> = ({
  task,
  completions,
  onTaskComplete
}) => {
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onTaskComplete(task.id);
    }
  };

  // Check if this task has been completed recently (within the last 24 hours)
  const latestCompletion = completions.find(
    (completion) => completion.task_id === task.id
  );

  const isRecentlyCompleted = latestCompletion
    ? (() => {
        const completionTime = new Date(latestCompletion.completed_at);
        const now = new Date();
        const hoursDiff =
          (now.getTime() - completionTime.getTime()) / (1000 * 60 * 60);
        return hoursDiff < 24;
      })()
    : false;

  return (
    <li className={styles.taskItem}>
      <input
        type="checkbox"
        checked={isRecentlyCompleted}
        onChange={handleCheckboxChange}
        className={styles.taskCheckbox}
      />
      <span
        style={{
          textDecoration: isRecentlyCompleted ? 'line-through' : 'none',
          opacity: isRecentlyCompleted ? 0.6 : 1
        }}
      >
        {task.title}
      </span>
    </li>
  );
};

export default TaskComponent;
