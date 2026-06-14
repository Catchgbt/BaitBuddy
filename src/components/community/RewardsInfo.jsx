import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Gift, Zap } from 'lucide-react';

export default function RewardsInfo() {
  const rewards = [
    {
      rank: 1,
      points: 5000,
      reward: '1 Monat Pro Plan',
      icon: Trophy,
      color: 'from-amber-500/20 to-amber-600/20',
      borderColor: 'border-amber-500/40',
      textColor: 'text-amber-400'
    },
    {
      rank: 2,
      points: 2500,
      reward: '2 Wochen Pro Plan',
      icon: Trophy,
      color: 'from-gray-400/10 to-gray-500/10',
      borderColor: 'border-gray-400/30',
      textColor: 'text-gray-300'
    },
    {
      rank: 3,
      points: 1000,
      reward: '1 Woche Pro Plan',
      icon: Gift,
      color: 'from-orange-500/20 to-orange-600/20',
      borderColor: 'border-orange-500/40',
      textColor: 'text-orange-400'
    },
    {
      rank: 4,
      points: 500,
      reward: 'KI-Tool deiner Wahl (1 Monat)',
      icon: Zap,
      color: 'from-cyan-500/20 to-blue-500/20',
      borderColor: 'border-cyan-500/40',
      textColor: 'text-cyan-400'
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-cyan-500/20 p-6 mb-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <Gift className="w-5 h-5 text-cyan-400" />
        <h2 className="text-xl font-bold text-white">Platzierungsboni</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rewards.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={idx}
              variants={itemVariants}
              className={`bg-gradient-to-br ${item.color} border ${item.borderColor} rounded-lg p-4 hover:shadow-lg transition`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${item.textColor}`} />
                  </div>
                  <span className={`font-bold ${item.textColor}`}>Platz {item.rank}</span>
                </div>
                <span className={`${item.textColor} font-bold text-sm`}>{item.points.toLocaleString()}</span>
              </div>

              <p className="text-sm text-gray-300 font-medium">{item.reward}</p>
              <div className="mt-2 pt-2 border-t border-white/10">
                <p className="text-xs text-gray-400">
                  {item.rank === 4
                    ? 'Wähle dein liebstes KI-Tool aus'
                    : `Kostenlos nutzen + ${item.points.toLocaleString()} Punkte`
                  }
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-700">
        <p className="text-sm text-gray-400 mb-3">
          <strong className="text-white">So funktioniert es:</strong>
        </p>
        <ul className="space-y-2 text-xs text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">→</span>
            <span>Nimm an Wettbewerben teil und sammle Punkte</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">→</span>
            <span>Platziere dich in den Top 4</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">→</span>
            <span>Erhalte automatisch kostenlose Premium-Features</span>
          </li>
        </ul>
      </div>
    </motion.div>
  );
}
