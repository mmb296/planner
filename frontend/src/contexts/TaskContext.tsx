import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState
} from 'react';

import { Task } from '../types';

type TaskContextType = {
  tasks: Task[];
  refreshTasks: () => Promise<void>;
  recordTaskCompletion: (taskId: number) => Promise<void>;
};

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};

type TaskProviderProps = {
  children: ReactNode;
};

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);

  const refreshTasks = async () => {
    const response = await fetch('http://localhost:5000/api/tasks');
    if (response.ok) {
      const tasksData = await response.json();
      setTasks(tasksData);
    } else {
      setTasks([]);
    }
  };

  const recordTaskCompletion = async (taskId: number) => {
    const response = await fetch('http://localhost:5000/api/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ task_id: taskId })
    });

    if (response.ok) {
      await refreshTasks();
    }
  };

  useEffect(() => {
    refreshTasks();
  }, []);

  return (
    <TaskContext.Provider value={{ tasks, refreshTasks, recordTaskCompletion }}>
      {children}
    </TaskContext.Provider>
  );
};
