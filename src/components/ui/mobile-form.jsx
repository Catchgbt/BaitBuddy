/**
 * Mobile-friendly form components
 * 
 * Wraps native form elements with proper touch targets,
 * screen reader labels, and mobile-optimized styling.
 */

import React from 'react';
import { cn } from '@/lib/utils';

export const MobileInput = React.forwardRef(
  ({ className, label, error, ...props }, ref) => (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300 min-h-[44px] flex items-center">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'min-h-[44px] w-full px-3 py-2 text-base rounded-lg',
          'bg-gray-800 border border-gray-700 text-gray-100',
          'focus:ring-2 focus:ring-cyan-400 focus:border-transparent',
          'placeholder:text-gray-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-red-500 focus:ring-red-400',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
);

MobileInput.displayName = 'MobileInput';

export const MobileSelect = React.forwardRef(
  ({ className, label, options = [], error, ...props }, ref) => (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300 min-h-[44px] flex items-center">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          'min-h-[44px] w-full px-3 py-2 text-base rounded-lg',
          'bg-gray-800 border border-gray-700 text-gray-100',
          'focus:ring-2 focus:ring-cyan-400 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-red-500 focus:ring-red-400',
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-400 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
);

MobileSelect.displayName = 'MobileSelect';

export const MobileCheckbox = React.forwardRef(
  ({ label, ...props }, ref) => (
    <div className="flex items-center min-h-[44px]">
      <input
        type="checkbox"
        ref={ref}
        className={cn(
          'w-5 h-5 rounded',
          'bg-gray-800 border border-gray-700',
          'focus:ring-2 focus:ring-cyan-400',
          'cursor-pointer'
        )}
        {...props}
      />
      {label && (
        <label className="ml-3 text-sm text-gray-300 cursor-pointer flex-1">
          {label}
        </label>
      )}
    </div>
  )
);

MobileCheckbox.displayName = 'MobileCheckbox';

export const MobileRadio = React.forwardRef(
  ({ label, ...props }, ref) => (
    <div className="flex items-center min-h-[44px]">
      <input
        type="radio"
        ref={ref}
        className={cn(
          'w-5 h-5 rounded-full',
          'bg-gray-800 border border-gray-700',
          'focus:ring-2 focus:ring-cyan-400',
          'cursor-pointer'
        )}
        {...props}
      />
      {label && (
        <label className="ml-3 text-sm text-gray-300 cursor-pointer flex-1">
          {label}
        </label>
      )}
    </div>
  )
);

MobileRadio.displayName = 'MobileRadio';

export const MobileTextarea = React.forwardRef(
  ({ className, label, error, ...props }, ref) => (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          'min-h-[120px] w-full px-3 py-2 text-base rounded-lg',
          'bg-gray-800 border border-gray-700 text-gray-100',
          'focus:ring-2 focus:ring-cyan-400 focus:border-transparent',
          'placeholder:text-gray-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'resize-vertical',
          error && 'border-red-500 focus:ring-red-400',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
);

MobileTextarea.displayName = 'MobileTextarea';