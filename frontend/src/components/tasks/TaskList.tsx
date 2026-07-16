import React, { useEffect, useState } from 'react';

import {
  completeTask,
  deleteTask,
  getTasks,
  uncompleteTask
} from '../../services/taskApi';
import { Task } from '../../types';
import { daysFromNow } from '../../utils/dateTime';
import AddTask from './AddTask';
import TaskComponent from './Task';
import styles from './TaskList.module.css';

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  const fetchTasks = async () => {
    try {
      setTasks(await getTasks());
    } catch {
      setTasks([]);
    }
  };

  const recordTaskCompletion = async (taskId: number) => {
    try {
      await completeTask(taskId);
      await fetchTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTask(taskId);
      await fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const deleteTaskCompletion = async (taskId: number) => {
    try {
      await uncompleteTask(taskId);
      await fetchTasks();
    } catch (error) {
      console.error('Failed to uncomplete task:', error);
    }
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
        onTaskUncomplete={deleteTaskCompletion}
        onTaskDelete={handleDeleteTask}
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
