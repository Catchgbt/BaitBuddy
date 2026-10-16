import React from 'react';
import { BadgeCheck } from 'lucide-react';

export default function AllToolsFreeNotice({ compact = false }) {
  return (
    <div className={`bb-all-tools-free${compact ? ' is-compact' : ''}`} role="status">
      <BadgeCheck size={compact ? 20 : 24} aria-hidden="true" />
      <span>
        <strong>Alle Funktionen freigeschaltet</strong>
        <span>Alle Funktionen sind derzeit kostenlos freigeschaltet.</span>
      </span>
    </div>
  );
}
