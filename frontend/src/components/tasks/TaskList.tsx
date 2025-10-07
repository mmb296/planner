import React, { useEffect, useState } from 'react';

import { Task } from '../../types';
import { daysFromNow } from '../../utils/dateTime';
import EditTask from './EditTask';
import TaskComponent from './Task';
import styles from './TaskList.module.css';

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  // Fetch tasks from backend API
  const fetchTasks = async () => {
    const response = await fetch('http://localhost:5000/api/tasks');
    if (response.ok) {
      const tasksData = await response.json();
      setTasks(tasksData);
    } else {
      setTasks([]);
    }
  };

  // Record a task completion
  const recordTaskCompletion = async (taskId: number) => {
    const response = await fetch('http://localhost:5000/api/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ task_id: taskId })
    });

    if (response.ok) {
      // Refresh tasks to get the latest data
      await fetchTasks();
    }
  };

  // Fetch data on component mount
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
        <EditTask onTaskSaved={fetchTasks} />

        <ul>
          {renderTaskList(overdueTasks, false)}
          {renderTaskList(completedTodayTasks, true)}
        </ul>
      </div>
    </div>
  );
};

export default TaskList;
