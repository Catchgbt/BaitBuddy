import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import BuddyAvatar from '@/components/ai/BuddyAvatar';
import { useBuddyPreferences } from '@/lib/BuddyPreferencesContext';
export default function BuddyCard({ message, question = 'Hilf mir, meinen nächsten Angelausflug zu planen.' }) {
  const { activeBuddy } = useBuddyPreferences();
  return <Link to={`/KiBuddyBeta?question=${encodeURIComponent(question)}`} className="bb-card flex items-center gap-4 hover:bg-[#163245] transition-colors">
    <BuddyAvatar size={64}/><div className="min-w-0 flex-1"><span className="bb-eyebrow">{activeBuddy.name} · Dein KI-Buddy</span><p className="text-sm leading-relaxed text-slate-200 mt-1">{message}</p></div><ArrowUpRight size={20} className="text-cyan-300 shrink-0"/>
  </Link>;
}
