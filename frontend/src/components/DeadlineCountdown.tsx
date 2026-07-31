import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';

interface DeadlineCountdownProps {
  deadline: string | Date;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const DeadlineCountdown: React.FC<DeadlineCountdownProps> = ({
  deadline,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(deadline).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (isNaN(target) || difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        totalMs: difference,
        isExpired: false,
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  if (timeLeft.isExpired) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-semibold text-zinc-400 bg-zinc-800/60 border border-zinc-700/50 rounded-lg ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-4 py-2 text-base' : 'px-3 py-1 text-sm'
        } ${className}`}
      >
        {showIcon && <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
        Expired
      </span>
    );
  }

  const hoursTotal = timeLeft.days * 24 + timeLeft.hours;
  const isMoreThan24h = hoursTotal >= 24;
  const isLessThan1h = hoursTotal < 1;

  // Colors:
  // > 24h: Green
  // < 24h: Orange / Amber
  // < 1h: Red with subtle animation
  let colorStyles = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
  let IconComponent = Clock;
  let animationClass = '';

  if (isLessThan1h) {
    colorStyles = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    IconComponent = AlertCircle;
    animationClass = 'animate-pulse';
  } else if (!isMoreThan24h) {
    colorStyles = 'text-amber-400 bg-amber-500/10 border-amber-500/25';
    IconComponent = AlertTriangle;
  }

  const sizeStyles =
    size === 'sm'
      ? 'px-2.5 py-1 text-xs gap-1.5 rounded-md'
      : size === 'lg'
      ? 'px-4 py-2.5 text-base gap-2 rounded-xl font-bold tracking-wide'
      : 'px-3 py-1.5 text-sm gap-2 rounded-lg font-medium';

  return (
    <div
      className={`inline-flex items-center border font-mono tracking-tight ${colorStyles} ${sizeStyles} ${animationClass} ${className}`}
    >
      {showIcon && <IconComponent className={`${size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} shrink-0`} />}
      <span>
        {timeLeft.days > 0 && `${timeLeft.days} Days `}
        {`${timeLeft.hours} Hours ${timeLeft.minutes} Minutes ${timeLeft.seconds} Seconds`}
      </span>
    </div>
  );
};
