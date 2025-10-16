import React, { useEffect, useRef, useState } from 'react';

import { Task } from '../../types';
import EditTask from './EditTask';
import styles from './Task.module.css';

type TaskProps = {
  completed?: boolean;
  onTaskComplete: (taskId: number, completedAt?: string) => void;
  onTaskUncomplete: (taskId: number) => void;
  onTaskDelete: (taskId: number) => void;
  onTaskEdit: () => void;
  task: Task;
};

const TaskComponent: React.FC<TaskProps> = ({
  completed = false,
  onTaskComplete,
  onTaskUncomplete,
  onTaskDelete,
  onTaskEdit,
  task
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [completedDate, setCompletedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
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
      onTaskComplete(task.id); // Complete with current time
    } else {
      onTaskUncomplete(task.id);
    }
  };

  const handleCompleteWithDate = () => {
    setShowDatePicker(true);
    setShowMenu(false);
  };

  const handleDateSubmit = () => {
    if (completedDate) {
      const isoDate = new Date(completedDate + 'T00:00:00').toISOString();
      onTaskComplete(task.id, isoDate);
      setShowDatePicker(false);
      setCompletedDate('');
    }
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
    setCompletedDate(new Date().toISOString().split('T')[0]);
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

  if (showDatePicker) {
    return (
      <li className={styles.taskItem}>
        <div className={styles.datePickerContainer}>
          <span className={styles.taskTitle}>{task.title}</span>
          <div className={styles.datePickerRow}>
            <div className={styles.datePicker}>
              <input
                id={`date-${task.id}`}
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
                className={styles.dateInput}
              />
              <button
                onClick={handleDateSubmit}
                className={styles.confirmButton}
              >
                ✓
              </button>
            </div>
            <button onClick={handleDateCancel} className={styles.cancelButton}>
              ×
            </button>
          </div>
        </div>
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
            <button
              onClick={handleCompleteWithDate}
              className={styles.menuItem}
            >
              Complete
            </button>
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
