import './CountdownBanner.css';

import { useEffect, useState } from 'react';

import { API_ENDPOINTS } from '../config/api';

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

const CountdownBanner = () => {
  const [isClosed, setIsClosed] = useState(false);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Fetch countdown config from API
  useEffect(() => {
    const fetchCountdownConfig = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.COUNTDOWN);
        if (response.ok) {
          const data = await response.json();
          if (data.target_date) {
            setTargetDate(new Date(data.target_date));
          }
          if (data.title) {
            setTitle(data.title);
          }
        }
      } catch (error) {
        console.error('Failed to fetch countdown config:', error);
      }
    };

    fetchCountdownConfig();
  }, []);

  const shouldShowBanner = !isClosed && targetDate !== null;

  useEffect(() => {
    if (!shouldShowBanner) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate!.getTime();
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
  }, [shouldShowBanner, targetDate]);

  if (!shouldShowBanner) {
    return null;
  }

  return (
    <div className="countdown-banner">
      <button
        className="countdown-close"
        onClick={() => setIsClosed(true)}
        aria-label="Close banner"
      >
        ×
      </button>
      <div className="countdown-content">
        {title && <span className="countdown-title">{title}</span>}
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
