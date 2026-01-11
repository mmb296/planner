import React from 'react';

import styles from './Day.module.css';

type DotProps = {
  isPeriodDay: boolean;
  onClick: () => void;
};

const Dot: React.FC<DotProps> = ({ isPeriodDay, onClick }) => {
  return (
    <button
      type="button"
      className={`${styles.dot} ${isPeriodDay ? styles.dotFilled : ''}`}
      onClick={onClick}
      aria-label={isPeriodDay ? 'Remove period' : 'Mark as period'}
      title={isPeriodDay ? 'Remove period' : 'Mark as period'}
    />
  );
};

export default Dot;
