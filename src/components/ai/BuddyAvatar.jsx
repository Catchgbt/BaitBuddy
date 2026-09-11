import React from 'react';
import { useBuddyPreferences } from '@/lib/BuddyPreferencesContext';
export const BUDDY_AVATAR_CSS = '.buddy-avatar{border-radius:18px;overflow:hidden}.buddy-avatar--listening{outline:2px solid #22d3ee;outline-offset:3px}.buddy-avatar--speaking{outline:2px solid #34d399;outline-offset:3px}';
export default function BuddyAvatar({ speaking = false, listening = false, size = 96, className = '', style = {}, buddy }) {
  const { activeBuddy } = useBuddyPreferences();
  const selected = buddy || activeBuddy;
  return <img src={selected.avatar} alt={`${selected.name}, dein KI-Buddy`} width={size} height={size} className={`bb-buddy-photo buddy-avatar ${speaking ? 'buddy-avatar--speaking' : listening ? 'buddy-avatar--listening' : ''} ${className}`} data-speaking={speaking} style={{ width: size, height: size, ...style }}/>;
}
