import React, { useState } from 'react';
import { Compass, MapPin, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const steps = [
  { title: 'Dein nächster Angelplatz', text: 'Suche nach einem gespeicherten Gewässer oder einem Ort. Die Fischfilter zeigen Spots mit hinterlegter Fischart.', icon: Compass },
  { title: 'Spots entdecken & speichern', text: 'Tippe auf einen Marker für die Vorschau. Über Details öffnest du alle Infos. Tippe auf eine freie Kartenstelle, um dort einen Spot zu speichern oder deinen Standort zu setzen.', icon: MapPin },
  { title: 'Deine Karte, deine Ansicht', text: 'Über das Ebenen-Symbol wählst du Kartenlayer. Unter Kartenoptionen findest du Wetter-Radar, Beißzeiten, öffentliche Spots und Angelkarten-Verkaufsstellen.', icon: Layers },
];

export default function MapModeManager({ onTourComplete }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const finish = () => {
    setOpen(false);
    localStorage.setItem('mapTourCompleted', 'true');
    onTourComplete?.();
  };
  const current = steps[step];
  const Icon = current.icon;
  return <>
    <button type="button" className="bb-map-help" onClick={() => { setStep(0); setOpen(true); }}><Compass size={18} />Kurze Kartentour</button>
    <Dialog open={open} onOpenChange={value => { if (!value) finish(); }}>
      <DialogContent className="bb-map-tour">
        <Icon size={28} className="text-cyan-400" />
        <DialogTitle>{current.title}</DialogTitle>
        <DialogDescription>{current.text}</DialogDescription>
        <div className="flex items-center justify-between gap-3 mt-4"><span className="text-sm text-slate-400">{step + 1} / {steps.length}</span><button type="button" className="bb-map-help" onClick={() => step === steps.length - 1 ? finish() : setStep(value => value + 1)}>{step === steps.length - 1 ? 'Karte entdecken' : 'Weiter'}</button></div>
      </DialogContent>
    </Dialog>
  </>;
}
