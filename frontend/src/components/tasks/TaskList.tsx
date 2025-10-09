import React from 'react';

import { useTaskContext } from '../../contexts/TaskContext';
import { Task } from '../../types';
import { daysFromNow } from '../../utils/dateTime';
import AddTask from './AddTask';
import TaskComponent from './Task';
import styles from './TaskList.module.css';

const TaskList: React.FC = () => {
  const { tasks, recordTaskCompletion } = useTaskContext();

  const overdueTasks = tasks.filter((task) => {
    if (!task.completed_at) return true;

    return (
      Math.abs(daysFromNow(new Date(task.completed_at).getTime())) >=
      task.repeat_days
    );
  });

  const completedTodayTasks = tasks.filter((task) => {
    return (
      task.completed_at &&
      daysFromNow(new Date(task.completed_at).getTime()) === 0
    );
  });

  // Helper function to render task list
  const renderTaskList = (taskList: Task[], completed = false) => {
    if (taskList.length === 0) return null;

    return taskList.map((task) => (
      <TaskComponent
        key={task.id}
        task={task}
        completed={completed}
        onTaskComplete={recordTaskCompletion}
      />
    ));
  };

  return (
    <div className={styles.taskList}>
      <h3 className={styles.taskListTitle}>Recurring Tasks</h3>

      <div className={styles.taskContent}>
        <AddTask />

        <ul>
          {renderTaskList(overdueTasks, false)}
          {renderTaskList(completedTodayTasks, true)}
        </ul>
      </div>
    </div>
  );
};

export default TaskList;
