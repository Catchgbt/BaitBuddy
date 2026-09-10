import React from 'react';
import {
  Anchor, Backpack, BarChart3, Bluetooth, BookOpen, Box, Boxes, Brain, CalendarDays,
  Camera, CloudSun, Crown, Egg, Fish, FlaskConical, Layers, LayoutDashboard, Link2,
  Lock, Map, MapPinned, MessageCircle, Mic, Navigation, ScanEye, Settings, Ship,
  TrendingUp, Trophy, User, Waves, Worm,
} from 'lucide-react';

// Der Katalog (shared/toolUnlocks.js) muss importfrei bleiben und speichert
// deshalb nur Icon-NAMEN. Diese explizite Zuordnung hält das Bundle klein —
// ein dynamischer Zugriff auf das komplette lucide-Paket würde alle Icons
// einziehen.
const ICONS = {
  Anchor, Backpack, BarChart3, Bluetooth, BookOpen, Box, Boxes, Brain, CalendarDays,
  Camera, CloudSun, Crown, Egg, Fish, FlaskConical, Layers, LayoutDashboard, Link2,
  Map, MapPinned, MessageCircle, Mic, Navigation, ScanEye, Settings, Ship,
  TrendingUp, Trophy, User, Waves, Worm,
};

/**
 * Rendert das Icon eines Tools bzw. Rangs. Unbekannte Namen fallen auf ein
 * Schloss zurück, statt die Seite mit einem undefined-Element abstürzen zu
 * lassen.
 */
export default function ToolIcon({ name, className = 'w-5 h-5', ...props }) {
  const Component = ICONS[name] || Lock;
  return <Component className={className} aria-hidden="true" {...props} />;
}

export function hasToolIcon(name) {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}
