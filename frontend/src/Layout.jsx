import { Outlet, NavLink } from 'react-router-dom';
import { Home, MessageCircle, BookOpen, Map, Users, Star, UserCircle } from 'lucide-react';

const tabs = [
  { to: '/app', label: 'Home', icon: Home },
  { to: '/app/chat', label: 'KI-Chat', icon: MessageCircle },
  { to: '/app/log', label: 'Fangbuch', icon: BookOpen },
  { to: '/app/map', label: 'Karte', icon: Map },
  { to: '/app/community', label: 'Community', icon: Users },
  { to: '/app/premium', label: 'Premium', icon: Star },
  { to: '/app/profile', label: 'Profil', icon: UserCircle },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 z-50">
        <div className="flex justify-around items-center h-16 px-2 max-w-lg mx-auto">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/app'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[44px] ${
                  isActive ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                }`
              }>
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
