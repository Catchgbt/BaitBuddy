import React from 'react';
import { motion } from 'framer-motion';

const TaskItem = ({ task, index }) => {
  const getStatusText = () => {
    switch (task.status) {
      case 'pending': return 'Warte...';
      case 'completed': return '✓';
      case 'failed': return '✗';
      default: return '...';
    }
  };

  const getStatusColor = () => {
    switch (task.status) {
      case 'pending': return 'text-gray-400';
      case 'completed': return 'text-emerald-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-500';
    }
  };

  return (
    <motion.div
      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 + 0.5, duration: 0.3 }}
    >
      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium ${getStatusColor()}`}>{getStatusText()}</span>
        <span className="text-sm text-gray-300">{task.name}</span>
      </div>
      <span className="text-sm font-medium text-white">{task.result || '...'}</span>
    </motion.div>
  );
};

export default function AnalysisStatus({ tasks }) {
  if (!tasks || tasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-md font-semibold text-white mb-2">KI-Analyse</h3>
      {tasks.map((task, index) => (
        <TaskItem key={index} task={task} index={index} />
      ))}
    </div>
  );
}