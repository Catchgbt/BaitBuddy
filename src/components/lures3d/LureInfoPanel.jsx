import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Link2, Waves, Zap, AlertTriangle, Fish } from 'lucide-react';

// Technik-Wissen zum ausgewählten Köder und Führungsstil — Inhalte aus
// src/data/lureGuide.data.js, konsistent zur Buddy-Wissensbasis.
export default function LureInfoPanel({ lure, style }) {
  if (!lure) return null;

  return (
    <Card className="border-gray-800 bg-gray-900/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-white">{lure.name}</CardTitle>
        <p className="text-sm text-gray-400">{lure.kurzbeschreibung}</p>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Fish className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          {lure.zielfische.map((fisch) => (
            <Badge
              key={fisch}
              variant="outline"
              className="border-cyan-800 bg-cyan-950/40 text-cyan-300"
            >
              {fisch}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="single" collapsible defaultValue="fuehrung">
          <AccordionItem value="montage" className="border-gray-800">
            <AccordionTrigger className="text-sm text-gray-200 hover:no-underline">
              <span className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                Montage
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-gray-300">
              {lure.montage}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fuehrung" className="border-gray-800">
            <AccordionTrigger className="text-sm text-gray-200 hover:no-underline">
              <span className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                Führung{style ? `: ${style.name}` : ''}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-gray-300">
              {style ? style.beschreibung : null}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="bisserkennung" className="border-gray-800">
            <AccordionTrigger className="text-sm text-gray-200 hover:no-underline">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" aria-hidden="true" />
                Bisserkennung
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-gray-300">
              {lure.bisserkennung}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fehler" className="border-b-0 border-gray-800">
            <AccordionTrigger className="text-sm text-gray-200 hover:no-underline">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
                Typische Fehler
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-300">
                {lure.typischeFehler.map((fehler) => (
                  <li key={fehler}>{fehler}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
