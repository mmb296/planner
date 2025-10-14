import React, { useEffect, useRef, useState } from 'react';

import { Task } from '../../types';
import EditTask from './EditTask';
import styles from './Task.module.css';

type TaskProps = {
  completed?: boolean;
  onTaskComplete: (taskId: number) => void;
  onTaskDelete: (taskId: number) => void;
  onTaskEdit: () => void;
  task: Task;
};

const TaskComponent: React.FC<TaskProps> = ({
  completed = false,
  onTaskComplete,
  onTaskDelete,
  onTaskEdit,
  task
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showMenu) {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
          setShowMenu(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onTaskComplete(task.id);
    }
  };

  const handleTaskEdit = () => {
    setIsEditing(false);
    onTaskEdit();
  };

  const startEditing = () => {
    setShowMenu(false);
    setIsEditing(true);
  };

  const handleDelete = () => {
    setShowMenu(false);
    onTaskDelete(task.id);
  };

  if (isEditing) {
    return (
      <li className={styles.taskItem}>
        <EditTask task={task} onTaskEdit={handleTaskEdit} />
        <button
          onClick={() => setIsEditing(false)}
          className={styles.cancelButton}
          aria-label="Cancel editing"
        >
          ×
        </button>
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
      >
        {task.title}
      </span>
      <div className={styles.menuContainer} ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={styles.menuButton}
          aria-label="Task options"
        >
          ⋯
        </button>
        {showMenu && (
          <div className={styles.menu}>
            <button onClick={startEditing} className={styles.menuItem}>
              Edit
            </button>
            <button onClick={handleDelete} className={styles.menuItem}>
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
};

export default TaskComponent;
