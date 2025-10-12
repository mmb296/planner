import React, { useEffect, useState } from 'react';

import { API_ENDPOINTS } from '../../config/api';
import { Task } from '../../types';
import { daysFromNow } from '../../utils/dateTime';
import AddTask from './AddTask';
import TaskComponent from './Task';
import styles from './TaskList.module.css';

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  const fetchTasks = async () => {
    const response = await fetch(API_ENDPOINTS.TASKS);
    if (response.ok) {
      const tasksData = await response.json();
      setTasks(tasksData);
    } else {
      setTasks([]);
    }
  };

  const recordTaskCompletion = async (taskId: number) => {
    await fetch(API_ENDPOINTS.COMPLETIONS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ task_id: taskId })
    });

    await fetchTasks();
  };

  useEffect(() => {
    fetchTasks();
  }, []);

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

  const renderTaskList = (taskList: Task[], completed = false) => {
    if (taskList.length === 0) return null;

    return taskList.map((task) => (
      <TaskComponent
        key={task.id}
        completed={completed}
        onTaskComplete={recordTaskCompletion}
        onTaskEdit={fetchTasks}
        task={task}
      />
    ));
  };

  return (
    <div className={styles.taskList}>
      <h3 className={styles.taskListTitle}>Recurring Tasks</h3>

      <div className={styles.taskContent}>
        <AddTask onTaskAdd={fetchTasks} />

        <ul>
          {renderTaskList(overdueTasks, false)}
          {renderTaskList(completedTodayTasks, true)}
        </ul>
      </div>
    </div>
  );
};

export default TaskList;
