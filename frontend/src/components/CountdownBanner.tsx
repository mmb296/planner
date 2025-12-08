import './CountdownBanner.css';

import { useEffect, useState } from 'react';

interface CountdownBannerProps {
  targetDate?: Date;
  title?: string;
}

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
          <div className="countdown-item">
            <span className="countdown-value">{timeLeft.days}</span>
            <span className="countdown-label">Days</span>
          </div>
          <span className="countdown-separator">:</span>
          <div className="countdown-item">
            <span className="countdown-value">
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
            <span className="countdown-label">Hours</span>
          </div>
          <span className="countdown-separator">:</span>
          <div className="countdown-item">
            <span className="countdown-value">
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
            <span className="countdown-label">Minutes</span>
          </div>
          <span className="countdown-separator">:</span>
          <div className="countdown-item">
            <span className="countdown-value">
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
            <span className="countdown-label">Seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownBanner;
