import React from 'react';

import { Task, TaskCompletion } from '../types';
import TaskComponent from './Task';
import styles from './TaskList.module.css';

type TaskListProps = {
  tasks: Task[];
  completions: TaskCompletion[];
  onTaskComplete: (taskId: number) => void;
};

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  completions,
  onTaskComplete
}) => (
  <div className={styles.taskList}>
    <h3 className={styles.taskListTitle}>Recurring Tasks</h3>
    <ul>
      {tasks.map((task) => (
        <TaskComponent
          key={task.id}
          task={task}
          completions={completions}
          onTaskComplete={onTaskComplete}
        />
      ))}
    </ul>
  </div>
);

export default TaskList;
