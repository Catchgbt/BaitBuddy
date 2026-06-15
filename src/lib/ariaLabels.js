/**
 * ARIA Labels for Common Icons
 * 
 * Provides semantic labels for lucide-react icons to enhance accessibility.
 * Use these labels with aria-label when icons are used as interactive elements
 * or convey meaningful information.
 */

export const ariaLabels = {
  // Navigation
  Home: 'Startseite',
  ArrowLeft: 'Zurueck',
  ArrowRight: 'Weiter',
  Menu: 'Menue oeffnen',
  X: 'Schließen',
  ChevronDown: 'Optionen anzeigen',
  ChevronUp: 'Optionen verbergen',
  
  // Actions
  Plus: 'Hinzufuegen',
  Minus: 'Entfernen',
  Trash2: 'Loeschen',
  Trash: 'Loeschen',
  Edit2: 'Bearbeiten',
  Edit: 'Bearbeiten',
  Copy: 'Kopieren',
  Download: 'Herunterladen',
  Upload: 'Hochladen',
  Share2: 'Teilen',
  Share: 'Teilen',
  Save: 'Speichern',
  Settings: 'Einstellungen',
  
  // Status
  Check: 'Bestaetigt',
  X: 'Abgelehnt',
  AlertCircle: 'Warnung',
  AlertTriangle: 'Warnung',
  Info: 'Informationen',
  HelpCircle: 'Hilfe',
  
  // Common UI
  Search: 'Suchen',
  Bell: 'Benachrichtigungen',
  Heart: 'Favorit',
  Star: 'Bewertung',
  MapPin: 'Standort',
  Calendar: 'Datum',
  Clock: 'Uhrzeit',
  User: 'Benutzerprofil',
  Users: 'Benutzer',
  LogOut: 'Abmelden',
  LogIn: 'Anmelden',
  
  // Media
  Play: 'Abspielen',
  Pause: 'Pausieren',
  SkipForward: 'Naechster',
  SkipBack: 'Vorheriger',
  Volume2: 'Ton ein',
  VolumeX: 'Ton aus',
  Camera: 'Kamera',
  Mic: 'Mikrofon',
  
  // Data/Lists
  List: 'Listenansicht',
  Grid: 'Gitteransicht',
  Filter: 'Filtern',
  MoreVertical: 'Weitere Optionen',
  MoreHorizontal: 'Weitere Optionen',
  
  // Forms
  Eye: 'Passwort anzeigen',
  EyeOff: 'Passwort verbergen',
  Check: 'Bestaetigt',
  Maximize: 'Maximieren',
  Minimize: 'Minimieren',
  
  // Fishing specific
  Activity: 'Bissanzeiger',
  Zap: 'Blitzfang',
  TrendingUp: 'Erfolgsrate',
  Target: 'Zielort',
  Compass: 'Navigation',
  
  // Social
  MessageSquare: 'Nachricht',
  Send: 'Senden',
  Repeat: 'Teilen',
};

/**
 * Helper to safely get ARIA label with fallback
 */
export function getAriaLabel(iconName, fallback = '') {
  return ariaLabels[iconName] || fallback || iconName;
}

/**
 * Icon wrapper for common patterns with built-in ARIA labels
 * 
 * Usage:
 *   <IconButton icon={Check} label="Confirm" />
 */
export function createAccessibleIcon(Icon, label) {
  return (props) => (
    <Icon
      {...props}
      aria-label={label || getAriaLabel(Icon.displayName || Icon.name)}
      role="img"
    />
  );
}