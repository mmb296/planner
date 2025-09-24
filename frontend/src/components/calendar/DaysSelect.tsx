import React from 'react';

type DaysSelectProps = {
  value: number;
  onChange: (numDays: number) => void;
};

const DaysSelect: React.FC<DaysSelectProps> = ({ value, onChange }) => {
  return (
    <select
      id="days-select"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      <option value={1}>1 day</option>
      <option value={3}>3 days</option>
      <option value={7}>7 days</option>
      <option value={14}>14 days</option>
      <option value={30}>30 days</option>
    </select>
  );
};

export default DaysSelect;
