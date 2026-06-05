import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Home,
  Map,
  BookOpen,
  User,
  Brain,
  Cloud,
  Users,
  Trophy,
  Crown,
  Settings,
  Award,
  GraduationCap,
  Calendar,
  Wrench,
  Beaker,
  Anchor,
  ShoppingBag,
  Compass,
  Mic,
  ScrollText,
  Sparkles,
  LifeBuoy,
} from "lucide-react";
import { useNavigationContext } from "@/lib/NavigationContext";
import { trackFeatureClick } from "@/components/utils/tracker";

const tabs = [
  { name: "Dashboard", path: "Dashboard", icon: Home },
  { name: "Map", path: "Map", icon: Map },
  { name: "Logbook", path: "Logbook", icon: BookOpen },
  { name: "KI-Buddy", path: "KiBuddyBeta", icon: Brain },
  { name: "Wetter", path: "Weather", icon: Cloud },
  { name: "Wasser", path: "WaterAnalysis", icon: Compass },
  { name: "Tripplan", path: "TripPlanner", icon: Calendar },
  { name: "Köder", path: "BaitMixer", icon: Beaker },
  { name: "Geräte", path: "Devices", icon: Wrench },
  { name: "AR Knoten", path: "ARKnotenAssistent", icon: Anchor },
  { name: "Quiz", path: "Quiz", icon: GraduationCap },
  { name: "Prüfung", path: "AngelscheinPruefungSchonzeiten", icon: ScrollText },
  { name: "Lizenzen", path: "Licenses", icon: Award },
  { name: "Community", path: "Community", icon: Users },
  { name: "Events", path: "Events", icon: Sparkles },
  { name: "Rang", path: "Rank", icon: Trophy },
  { name: "Shop", path: "Shop", icon: ShoppingBag },
  { name: "Voice", path: "VoiceControl", icon: Mic },
  { name: "Premium", path: "PremiumPlans", icon: Crown },
  { name: "SOS", path: "WeatherAlerts", icon: LifeBuoy },
  { name: "Profil", path: "Profile", icon: User },
  { name: "Settings", path: "Settings", icon: Settings },
];

export default function BottomTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { switchTab, getTabStack } = useNavigationContext();

  const currentSegment = location.pathname.replace(/^\//, '').split('/')[0] || 'Dashboard';
  const isActive = (path) => currentSegment === path;

  const handleTabClick = (e, tab) => {
    e.preventDefault();
    trackFeatureClick(tab.path, { source: "bottom_tabs" });
    switchTab(tab.path);
    const tabStack = getTabStack(tab.path);
    if (tabStack.length > 0) {
      navigate(tabStack[tabStack.length - 1]);
    } else {
      navigate(createPageUrl(tab.path));
    }
  };

  return (
    <nav
      aria-label="Hauptnavigation"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-xl border-t border-gray-800 z-50"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
      role="tablist"
    >
      <div
        className="flex items-stretch overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory min-h-[56px]"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <style>{`
          nav[aria-label="Hauptnavigation"] > div::-webkit-scrollbar { display: none; }
        `}</style>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);

          return (
            <Link
              key={tab.path}
              to={createPageUrl(tab.path)}
              onClick={(e) => handleTabClick(e, tab)}
              aria-label={tab.name}
              aria-current={active ? 'page' : undefined}
              aria-selected={active}
              role="tab"
              className="flex flex-col items-center justify-center min-w-[68px] px-3 py-1.5 snap-start touch-target transition-colors"
            >
              <Icon
                aria-hidden="true"
                className={`w-6 h-6 mb-1 transition-colors ${active ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'text-gray-400'}`}
              />
              <span
                className={`text-[11px] font-medium whitespace-nowrap transition-colors ${active ? 'text-cyan-400' : 'text-gray-400'}`}
                aria-hidden="true"
              >
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}