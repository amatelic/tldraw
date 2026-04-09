import { useState, useRef, useCallback, type ReactNode } from 'react';
import './Tooltip.css';

interface TooltipProps {
  children: ReactNode;
  content: string;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({
  children,
  content,
  delay = 300,
  position = 'top',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div className={`tooltip tooltip-${position}`} role="tooltip">
          {content}
        </div>
      )}
    </div>
  );
}
