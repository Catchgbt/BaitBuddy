import React from 'react';
import { motion } from 'framer-motion';

function CardActions({ actions = [], onAction }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="p-4 sm:p-6 space-y-2 border-t border-gray-800 bg-gradient-to-b from-transparent to-gray-900/50">
      {actions.map((action, index) => (
        <motion.button
          key={index}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onAction?.(action.id || index, action)}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
            action.variant === 'secondary'
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg hover:shadow-cyan-500/50'
          }`}
        >
          {action.icon && <span className="mr-2">{action.icon}</span>}
          {action.label || 'Action'}
        </motion.button>
      ))}
    </div>
  );
}

export default CardActions;
