import React, { useState, useEffect } from "react";
import { AlertTriangle, Edit3, ChevronRight, Circle, ShoppingCart, CheckCircle2 } from "lucide-react";

// Status-Definitionen, inspiriert vom Stepper
const STATUS = {
  NOT_PRESENT: 1, // nicht dabei
  TO_GET: 2,      // besorgst du noch
  HAVE_IT: 3,     // hab ich
};

const gearItems = [
  { id: 'zange', label: 'Zange/Hakenlöser', important: true, section: 'tools' },
  { id: 'kescher', label: 'Kescher', important: true, section: 'tools' },
  { id: 'polbrille', label: 'Polbrille', important: true, section: 'tools' },
  { id: 'kopflampe', label: 'Kopflampe', important: false, section: 'tools' },
  { id: 'erstehilfe', label: 'Erste-Hilfe-Kit', important: false, section: 'tools' },
  { id: 'spinnrute', label: 'Spinnrute 10-40g', important: true, section: 'rod' },
  { id: 'rolle', label: 'Rolle 2500er Größe', important: true, section: 'rod' },
  { id: 'backuprute', label: 'Backup-Rute', important: false, section: 'rod' },
  { id: 'backuprolle', label: 'Backup-Rolle', important: false, section: 'rod' },
  { id: 'geflochtene', label: 'Geflochtene 0,12mm', important: true, section: 'line' },
  { id: 'fluorocarbon', label: 'Fluorocarbon 0,30mm', important: true, section: 'line' },
  { id: 'monofil', label: 'Monofil 0,25mm', important: false, section: 'line' },
];

function Stat({ value, label, tone }) {
  const toneClasses = {
    blue: "from-slate-800 to-slate-900 text-blue-400",
    green: "from-slate-800 to-slate-900 text-emerald-400",
    yellow: "from-slate-800 to-slate-900 text-yellow-400",
    red: "from-slate-800 to-slate-900 text-red-400",
  }[tone];
  return (
    <div className={`rounded-xl bg-gradient-to-b ${toneClasses} p-4 text-center border border-slate-800`}>
      <div className="text-3xl font-semibold leading-none">{value}</div>
      <div className="mt-1 text-sm text-slate-300">{label}</div>
    </div>
  );
}

function BadgeWichtig() {
  return (
    <span className="ml-2 rounded-full bg-[rgba(244,63,94,0.15)] px-2 py-0.5 text-xs font-medium text-rose-300 border border-rose-800/40">
      Wichtig
    </span>
  );
}

function ChecklistItem({ label, important = false, status, onStatusChange }) {
  const cycleStatus = () => {
    if (status === STATUS.HAVE_IT) onStatusChange(STATUS.TO_GET);
    else if (status === STATUS.TO_GET) onStatusChange(STATUS.NOT_PRESENT);
    else onStatusChange(STATUS.HAVE_IT);
  };

  const statusConfig = {
    [STATUS.NOT_PRESENT]: { icon: <Circle className="text-slate-500" size={20} />, textClass: "text-slate-400", decoration: "" },
    [STATUS.TO_GET]: { icon: <ShoppingCart className="text-amber-400" size={20} />, textClass: "text-amber-300", decoration: "" },
    [STATUS.HAVE_IT]: { icon: <CheckCircle2 className="text-emerald-400" size={20} />, textClass: "text-slate-100", decoration: "line-through" },
  };
  
  const currentConfig = statusConfig[status];

  return (
    <button onClick={cycleStatus} className="flex w-full items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-left">
      {currentConfig.icon}
      <span className={`flex-1 text-[15px] ${currentConfig.textClass} ${currentConfig.decoration}`}>{label}</span>
      {important && <BadgeWichtig />}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-6">
      <h3 className="mb-3 px-1 text-base font-semibold text-slate-200">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function CatchgbtAusrüstung() {
  const [itemStatuses, setItemStatuses] = useState(() => {
    const initial = {};
    gearItems.forEach(item => initial[item.id] = STATUS.NOT_PRESENT);
    return initial;
  });

  useEffect(() => {
    // KI-Buddy über Funktionsaufruf informieren
    window.dispatchEvent(new CustomEvent('kiBuddyFunctionCall', {
      detail: {
        functionName: 'gear',
        context: { timestamp: Date.now() }
      }
    }));
  }, []);

  const handleStatusChange = (id, newStatus) => {
    setItemStatuses(prev => ({...prev, [id]: newStatus}));
  };

  const stats = (() => {
    const total = gearItems.length;
    const importantItems = gearItems.filter(i => i.important);
    
    const packed = gearItems.filter(i => itemStatuses[i.id] === STATUS.HAVE_IT).length;
    const packedImportant = importantItems.filter(i => itemStatuses[i.id] === STATUS.HAVE_IT).length;
    
    const toGetCount = gearItems.filter(i => itemStatuses[i.id] === STATUS.TO_GET).length;
    const missingImportant = importantItems.length - packedImportant;
    
    const readiness = total > 0 ? Math.round((packed / total) * 100) : 0;
    
    let readinessTone = 'red';
    if (readiness > 75) readinessTone = 'green';
    else if (readiness > 40) readinessTone = 'yellow';
    
    return {
      packed, total,
      packedImportant, importantTotal: importantItems.length,
      readiness, readinessTone,
      missingImportant, toGetCount
    };
  })();

  const renderItemsForSection = (section) => 
    gearItems.filter(i => i.section === section).map(item => (
      <ChecklistItem 
        key={item.id}
        label={item.label}
        important={item.important}
        status={itemStatuses[item.id]}
        onStatusChange={(newStatus) => handleStatusChange(item.id, newStatus)}
      />
    ));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      <main className="mx-auto max-w-md px-4 pt-4">
        <h1 className="text-2xl font-bold">Ausrüstung & Gear</h1>
        <p className="mt-1 text-slate-400">Überprüfe deine Angelausrüstung vor dem Trip</p>

        {/* Dashboard-Karte */}
        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded-md border border-slate-700 bg-slate-800">📦</span>
            Vollständigkeit
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <Stat value={`${stats.packed}/${stats.total}`} label="Gesamt" tone="blue" />
            <Stat value={`${stats.packedImportant}/${stats.importantTotal}`} label="Wesentlich" tone="green" />
            <Stat value={`${stats.readiness}%`} label="Bereitschaft" tone={stats.readinessTone} />
          </div>

          {(stats.missingImportant > 0 || stats.toGetCount > 0) && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-800/40 bg-amber-900/20 p-3 text-amber-200">
              <AlertTriangle className="mt-0.5" size={18} />
              <p className="text-sm">
                {stats.missingImportant > 0 && `${stats.missingImportant} wesentliche Teile fehlen noch. `}
                {stats.toGetCount > 0 && `${stats.toGetCount} Teile werden noch besorgt.`}
              </p>
            </div>
          )}
        </div>

        {/* Sektionen */}
        <Section title="Werkzeug & Sicherheit">
          {renderItemsForSection('tools')}
        </Section>

        <Section title="Rute & Rolle">
          {renderItemsForSection('rod')}
        </Section>

        <Section title="Schnur & Vorfach">
          {renderItemsForSection('line')}
        </Section>

        {/* KI-Empfehlungen */}
        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="mb-3 text-base font-semibold">KI-Empfehlungen</h3>
          <div className="grid grid-cols-2 gap-3">
            <button aria-label="KI-Tipp: Was fehlt noch?" className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm">
              <span>Was fehlt noch?</span>
              <ChevronRight aria-hidden="true" size={18} className="text-slate-400" />
            </button>
            <button aria-label="KI-Tipp: 3 Koeder-Setups anzeigen" className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm">
              <span>3 Koeder-Setups</span>
              <ChevronRight aria-hidden="true" size={18} className="text-slate-400" />
            </button>
          </div>
        </div>
      </main>

      {/* Floating Edit */}
      <button className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm backdrop-blur">
        <Edit3 size={18} />
        <span>Edit App</span>
      </button>
    </div>
  );
}