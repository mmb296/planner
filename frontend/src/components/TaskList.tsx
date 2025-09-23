import React, { useEffect, useState } from 'react';

import { HttpError } from '../errors';
import { Task } from '../types';
import TaskComponent from './Task';
import styles from './TaskList.module.css';

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  // Fetch tasks from backend API
  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/tasks');
      if (!response.ok) {
        throw new HttpError(
          `Failed to fetch tasks: ${response.statusText}`,
          response.status
        );
      }
      const tasksData = await response.json();
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setTasks([]);
    }
  };

  // Record a task completion
  const recordTaskCompletion = async (taskId: number) => {
    try {
      const response = await fetch('http://localhost:5000/api/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_id: taskId })
      });

      if (!response.ok) {
        throw new HttpError(
          `Failed to record completion: ${response.statusText}`,
          response.status
        );
      }

      // Refresh tasks to get the latest data
      await fetchTasks();
    } catch (error) {
      console.error('Failed to record task completion:', error);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className={styles.taskList}>
      <h3 className={styles.taskListTitle}>Recurring Tasks</h3>
      <ul>
        {tasks.map((task) => (
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
