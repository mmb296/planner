import React, { useState } from 'react';

import { Task } from '../../types';
import EditTask from './EditTask';
import styles from './Task.module.css';

type TaskProps = {
  task: Task;
  completed?: boolean;
  onTaskComplete: (taskId: number) => void;
  onTaskEdit: () => void;
};

const TaskComponent: React.FC<TaskProps> = ({
  task,
  completed = false,
  onTaskComplete,
  onTaskEdit
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onTaskComplete(task.id);
    }
  };

  const handleTaskEdit = () => {
    setIsEditing(false);
    onTaskEdit();
  };

  if (isEditing) {
    return (
      <li className={styles.taskItem}>
        <EditTask task={task} onTaskEdit={handleTaskEdit} />
      </li>
    );
  }

  return (
    <li className={styles.taskItem}>
      <input
        type="checkbox"
        checked={completed}
        onChange={handleCheckboxChange}
        className={styles.taskCheckbox}
      />
      <span
        style={{
          textDecoration: completed ? 'line-through' : 'none',
          opacity: completed ? 0.6 : 1
        }}
        className={styles.taskTitle}
        onClick={() => setIsEditing(true)}
      >
        {task.title}
      </span>
    </li>
  );
};

export default TaskComponent;
