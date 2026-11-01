import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div
          role="tooltip"
          className={`absolute ${positionClasses[position]} z-50 pointer-events-none whitespace-nowrap rounded-md bg-neutral-900 border border-neutral-700/80 px-2.5 py-1 text-xs font-medium text-neutral-200 shadow-xl backdrop-blur-md transition-opacity duration-150 animate-in fade-in`}
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-4 border-transparent ${
              position === 'top'
                ? 'top-full left-1/2 -translate-x-1/2 border-t-neutral-900'
                : position === 'bottom'
                ? 'bottom-full left-1/2 -translate-x-1/2 border-b-neutral-900'
                : position === 'left'
                ? 'left-full top-1/2 -translate-y-1/2 border-l-neutral-900'
                : 'right-full top-1/2 -translate-y-1/2 border-r-neutral-900'
            }`}
          />
        </div>
      )}
    </div>
  );
};
