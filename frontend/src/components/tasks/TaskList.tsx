import React, { useEffect, useState } from 'react';

import { Task } from '../../types';
import { daysFromNow } from '../../utils/dateTime';
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

  const visibleTasks = tasks.filter((task) => {
    if (!task.completed_at) {
      return true; // Show incomplete tasks
    }

    // Show completed tasks only if they were completed today
    const completionTime = new Date(task.completed_at).getTime();
    return daysFromNow(completionTime) === 0;
  });

  return (
    <div className={styles.taskList}>
      <h3 className={styles.taskListTitle}>Recurring Tasks</h3>
      <ul>
        {visibleTasks.map((task) => (
          <TaskComponent
            key={task.id}
            task={task}
            onTaskComplete={recordTaskCompletion}
          />
        ))}
      </ul>
    </div>
  );
};

export default TaskList;
