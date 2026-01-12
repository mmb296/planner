import React, { useEffect, useState } from 'react';

import { usePeriodDays } from '../../hooks/usePeriodDays';
import {
  formatDateString,
  formatMonthName,
  getDaysInMonth,
  getMonthEnd,
  getMonthStart,
  getNextMonth,
  getPreviousMonth,
  isToday
} from '../../utils/dateTime';
import styles from './PeriodCalendar.module.css';

type PeriodCalendarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const PeriodCalendar: React.FC<PeriodCalendarProps> = ({ isOpen, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { periodDays, togglePeriodDay } = usePeriodDays(
    getMonthStart(currentMonth),
    getMonthEnd(currentMonth)
  );

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentMonth(getPreviousMonth(currentMonth));
  };

  const goToNextMonth = () => {
    setCurrentMonth(getNextMonth(currentMonth));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const days = getDaysInMonth(currentMonth);
  const monthName = formatMonthName(currentMonth);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Period Calendar</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.monthNavigation}>
          <button onClick={goToPreviousMonth} className={styles.navButton}>
            ←
          </button>
          <button onClick={goToToday} className={styles.todayButton}>
            Today
          </button>
          <span className={styles.monthName}>{monthName}</span>
          <button onClick={goToNextMonth} className={styles.navButton}>
            →
          </button>
        </div>

        <div className={styles.calendarGrid}>
          {weekDays.map((day) => (
            <div key={day} className={styles.weekDay}>
              {day}
            </div>
          ))}
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className={styles.dayCell} />;
            }

            const dateStr = formatDateString(date);

            return (
              <button
                key={dateStr}
                type="button"
                className={`${styles.dayCell} ${isToday(date) ? styles.today : ''} ${
                  periodDays.has(dateStr) ? styles.periodDay : ''
                }`}
                onClick={() => togglePeriodDay(dateStr)}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PeriodCalendar;
