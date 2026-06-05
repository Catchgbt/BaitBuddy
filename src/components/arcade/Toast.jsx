import React, { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  const bgColors = {
    success: 'bg-gradient-to-r from-green-600 to-green-700',
    error: 'bg-gradient-to-r from-red-600 to-red-700',
    info: 'bg-gradient-to-r from-blue-600 to-blue-700',
    warning: 'bg-gradient-to-r from-yellow-600 to-yellow-700'
  };

  return (
    <div 
      className={`fixed top-5 right-5 ${bgColors[type]} text-white px-5 py-4 rounded-xl shadow-2xl z-[1000] min-w-[250px] flex items-center gap-3 cursor-pointer animate-in slide-in-from-right duration-300`}
      onClick={onClose}
    >
      <span className="text-xl font-bold">{icons[type]}</span>
      <span className="flex-1 font-medium">{message}</span>
    </div>
  );
}