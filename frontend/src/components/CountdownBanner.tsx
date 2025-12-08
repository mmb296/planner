import './CountdownBanner.css';

import { useEffect, useState } from 'react';

interface CountdownBannerProps {
  targetDate?: Date;
  title?: string;
}

interface CountdownItemProps {
  value: number;
  label: string;
  padZero?: boolean;
}

const CountdownItem = ({
  value,
  label,
  padZero = false
}: CountdownItemProps) => {
  const displayValue = padZero ? String(value).padStart(2, '0') : value;

  return (
    <div className="countdown-item">
      <span className="countdown-value">{displayValue}</span>
      <span className="countdown-label">{label}</span>
    </div>
  );
};

const CountdownBanner = ({
  targetDate = new Date('2025-01-01T00:00:00'),
  title = 'Countdown'
}: CountdownBannerProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor(
            (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          ),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="countdown-banner">
      <div className="countdown-content">
        <span className="countdown-title">{title}</span>
        <div className="countdown-timer">
          <CountdownItem value={timeLeft.days} label="Days" />
          <span className="countdown-separator">:</span>
          <CountdownItem value={timeLeft.hours} label="Hours" padZero />
          <span className="countdown-separator">:</span>
          <CountdownItem value={timeLeft.minutes} label="Minutes" padZero />
          <span className="countdown-separator">:</span>
          <CountdownItem value={timeLeft.seconds} label="Seconds" padZero />
        </div>
      </div>
    </div>
  );
};

export default CountdownBanner;
