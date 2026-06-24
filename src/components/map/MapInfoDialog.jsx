import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MapPin, 
  Navigation, 
  Search, 
  Clock,
  Star,
  Building2,
  Info
} from 'lucide-react';

export default function MapInfoDialog({ isOpen, onClose }) {
  const features = [
    {
      icon: MapPin,
      title: "Spots hinzufügen",
      description: "Klicke auf 'Spot hinzufügen' um neue Angelplätze zu markieren. GPS-Koordinaten werden automatisch gespeichert.",
      color: "text-cyan-400"
    },
    {
      icon: Navigation,
      title: "GPS-Standort",
      description: "Nutze 'Mein Standort' um deine aktuelle Position anzuzeigen. Die Karte zentriert sich automatisch auf deinen Standort.",
      color: "text-blue-400"
    },
    {
      icon: Clock,
      title: "Fahrzeitberechnung",
      description: "Klicke auf einen Spot für Details. Du erhältst die geschätzte Fahrzeit und Entfernung von deinem aktuellen Standort.",
      color: "text-emerald-400"
    },
    {
      icon: Star,
      title: "Favoriten markieren",
      description: "Markiere deine besten Spots als Favoriten. Filtere die Karte nach Favoriten über die Legende.",
      color: "text-yellow-400"
    },
    {
      icon: Search,
      title: "Filter & Legende",
      description: "Nutze die Legende links oben, um zwischen deinen Spots, öffentlichen Orten und Favoriten zu filtern.",
      color: "text-purple-400"
    },
    {
      icon: Building2,
      title: "Öffentliche Orte",
      description: "Entdecke Angelvereine und Angelparks in deiner Nähe. Diese sind mit grünen Markern gekennzeichnet.",
      color: "text-green-400"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-morphism max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
            <Info className="w-6 h-6" />
            Karten-Funktionen
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Entdecke alle Möglichkeiten der interaktiven Karte
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="flex gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center ${feature.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-cyan-300 font-medium mb-1">Tipp:</p>
              <p className="text-gray-300">
                Spots werden automatisch mit Wetter-, Fang- und Notizen-Daten verknüpft. 
                Je mehr Informationen du hinzufügst, desto bessere Empfehlungen bekommst du vom KI-Buddy!
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}