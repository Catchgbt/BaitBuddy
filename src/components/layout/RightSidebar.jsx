import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { useSound } from "@/components/utils/SoundManager";
import { X, Settings, User as UserIcon, Trophy, Crown, ShoppingCart, Award, FileText, Globe } from "lucide-react";

export default function RightSidebar({ isOpen, setIsOpen, currentPageName }) {
  const { triggerHaptic } = useHaptic();
  const { playSound } = useSound();

  const menuItems = [
  { name: "Profile", title: "Profil", icon: UserIcon },
  { name: "Shop", title: "Shop", icon: ShoppingCart },
  { name: "Premium", title: "Premium", icon: Crown },
  { name: "Rank", title: "Ranking", icon: Trophy },
  { name: "Licenses", title: "Angelschein & Lizenzen", icon: Award },
  { name: "Rules", title: "Regeln & Schonzeiten", icon: FileText },
  { name: "Settings", title: "Einstellungen", icon: Settings },
  { name: "Website", title: "CatchGbt Website", icon: Globe, external: true, url: "https://catchgbt-q7scna.manus.space/" }];


  const handleItemClick = () => {
    triggerHaptic('selection');
    playSound('selection');
    setIsOpen(false);
  };

  const handleClose = (e) => {
    e.stopPropagation();
    triggerHaptic('light');
    playSound('click');
    setIsOpen(false);
  };

  return (
    <>
      {isOpen &&
      <div
        className="fixed inset-0 bg-black/50 z-[60]"
        onClick={handleClose} />

      }
      
      <div className={`
        fixed top-0 right-0 h-full w-80 bg-gray-950/95 backdrop-blur-xl border-l border-gray-800 z-[60] 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="px-12 py-3 flex items-center justify-between border-b border-gray-800">
            <div className="text-lg font-semibold text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
              Erweitert
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose} className="text-red-700 pl-6 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent h-10 w-10 hover:text-white">


              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto py-6">
            <div className="px-6 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;

                // Externes Link-Item
                if (item.external) {
                  return (
                    <a
                      key={item.name}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleItemClick}
                      className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg transition-colors text-sm text-gray-300 hover:text-white hover:bg-gray-800/50">

                      <Icon className="w-4 h-4" />
                      {item.title}
                      <Globe className="w-3 h-3 ml-auto text-gray-500" />
                    </a>);

                }

                // Internes Link-Item
                return (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.name)}
                    onClick={handleItemClick}
                    className={`
                      flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg transition-colors text-sm
                      ${currentPageName === item.name ?
                    'bg-emerald-600 text-white font-medium' :
                    'text-gray-300 hover:text-white hover:bg-gray-800/50'}
                    `
                    }>

                    <Icon className="w-4 h-4" />
                    {item.title}
                  </Link>);

              })}
            </div>
          </nav>

          <div className="p-6 border-t border-gray-800">
            <div className="text-xs text-gray-500 text-center">
              Erweiterte Funktionen
            </div>
          </div>
        </div>
      </div>
    </>);

}