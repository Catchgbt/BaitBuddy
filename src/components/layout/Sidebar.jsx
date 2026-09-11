import React from 'react';
import { Link } from 'react-router-dom';
import { Home, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { navigationGroups } from '@/components/navigation/navigationItems';
import { useHaptic } from '@/components/utils/HapticFeedback';
import { useSound } from '@/components/utils/SoundManager';
import { auth } from '@/api/auth';
export default function Sidebar({ isOpen, setIsOpen, currentPageName, user }) {
  const { triggerHaptic } = useHaptic();
  const { playSound } = useSound();
  const close = () => { triggerHaptic('selection'); playSound('selection'); setIsOpen(false); };
  const activeGroup = navigationGroups.find(group => group.items.some(([, path]) => path.split('?')[0] === currentPageName));
  return <Sheet open={isOpen} onOpenChange={setIsOpen}>
    <SheetContent side="left" className="bb-app w-[88vw] max-w-sm border-0 overflow-y-auto pt-[max(28px,env(safe-area-inset-top))] pb-[max(28px,env(safe-area-inset-bottom))] [&>button]:h-11 [&>button]:w-11">
      <SheetHeader className="text-left"><SheetTitle className="text-white text-2xl">Bait<span className="text-cyan-400">Buddy</span></SheetTitle><SheetDescription className="bb-muted">Dein persönlicher Angelbegleiter</SheetDescription></SheetHeader>
      <Link className="bb-secondary w-full mt-6 mb-4" to="/Profile" onClick={close}>
        {(user?.profile_picture_url || user?.avatar_url) && <img src={user.profile_picture_url || user.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover"/>}
        <span>{user?.nickname || user?.full_name || 'Mein Profil'}</span>
      </Link>
      <nav aria-label="Alle Funktionen">
        <Link to="/Dashboard" onClick={close} aria-current={currentPageName === 'Dashboard' ? 'page' : undefined} className="bb-secondary w-full text-cyan-300 mb-3"><Home size={20}/><span>Dashboard <span className="bb-muted block text-xs">Dein Überblick</span></span></Link>
        <Accordion type="multiple" defaultValue={activeGroup ? [activeGroup.name] : []}>
          {navigationGroups.map(group => <AccordionItem key={group.name} value={group.name} className="border-white/5">
            <AccordionTrigger className="min-h-12 text-sm hover:no-underline">{group.name}</AccordionTrigger>
            <AccordionContent><div className="grid gap-1">{group.items.map(([label, path]) => <Link key={path} to={`/${path}`} onClick={close} aria-current={currentPageName === path.split('?')[0] ? 'page' : undefined} className="min-h-11 flex items-center rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5 aria-[current=page]:bg-cyan-400/10 aria-[current=page]:text-cyan-300">{label}</Link>)}</div></AccordionContent>
          </AccordionItem>)}
        </Accordion>
      </nav>
      <button type="button" className="bb-secondary w-full mt-6 text-red-300" onClick={() => auth.logout('/Home')}><LogOut size={18}/>Abmelden</button>
    </SheetContent>
  </Sheet>;
}
