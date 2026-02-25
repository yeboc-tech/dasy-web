'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface ExamTimerProps {
  /** 총 시간 (초) */
  totalSeconds: number;
  /** 타이머 활성화 여부 */
  enabled: boolean;
  /** 타이머 시작 여부 */
  isRunning: boolean;
  /** 시간 종료 시 콜백 */
  onTimeUp?: () => void;
}

export function ExamTimer({ totalSeconds, enabled, isRunning, onTimeUp }: ExamTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(totalSeconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);

  // Update timeRemaining when totalSeconds changes (before exam starts)
  useEffect(() => {
    if (!hasStartedRef.current) {
      setTimeRemaining(totalSeconds);
    }
  }, [totalSeconds]);

  // Initialize timer when it starts running
  useEffect(() => {
    if (isRunning && !hasStartedRef.current) {
      setTimeRemaining(totalSeconds);
      hasStartedRef.current = true;
    }
  }, [isRunning, totalSeconds]);

  // Countdown effect
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            onTimeUp?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, timeRemaining, onTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs.toString().padStart(2, '0')}초`;
  };

  // Don't render if timer is not enabled
  if (!enabled) {
    return null;
  }

  // Time's up
  if (hasStartedRef.current && timeRemaining === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg border bg-red-50 border-red-200 text-red-600">
        <Clock className="w-4 h-4" />
        <span className="font-semibold text-sm">시간 종료</span>
      </div>
    );
  }

  // Timer display (before start: gray, running: dynamic color)
  const getTimerStyle = () => {
    if (!isRunning) {
      // Before exam starts - gray/neutral style
      return 'bg-gray-50 border-gray-200 text-gray-500';
    }

    // Running timer - color based on time remaining
    if (timeRemaining <= 60) {
      return 'bg-red-50 border-red-200 text-red-600';
    }
    if (timeRemaining <= 300) {
      return 'bg-amber-50 border-amber-200 text-amber-600';
    }
    return 'bg-white border-gray-200 text-gray-700';
  };

  return (
    <div className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border ${getTimerStyle()}`}>
      <Clock className="w-4 h-4" />
      <span className="font-mono font-semibold text-sm">
        {formatTime(timeRemaining)}
      </span>
    </div>
  );
}
