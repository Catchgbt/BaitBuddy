import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spot } from "@/entities/Spot";
import { toast } from "sonner";
import { useHaptic } from "@/components/utils/HapticFeedback";
import { useOptimisticMutation } from "@/lib/useOptimisticMutation";

const SPORTS = [
  "Spinnfischen",
  "Fliegenfischen",
  "Grundangeln",
  "Karpfenangeln",
  "Hechtangeln",
  "Zanderangeln",
  "Forellenfischen",
  "Aalfischen",
  "Friedfische",
  "Barschfischen"
];

export default function SportSelectorModal({ isOpen, onClose, spot }) {
  const { triggerHaptic } = useHaptic();
  const [selectedSports, setSelectedSports] = useState(spot?.sports || []);

  const toggleSport = (sport) => {
    setSelectedSports(prev =>
      prev.includes(sport)
        ? prev.filter(s => s !== sport)
        : [...prev, sport]
    );
  };

  const updateSportsMutation = useOptimisticMutation({
    queryKey: 'mapSpots',
    mutationFn: ({ id, sports }) => Spot.update(id, { sports }),
    optimisticUpdate: (oldSpots = [], variables) =>
      oldSpots.map(spot =>
        spot.id === variables.id ? { ...spot, sports: variables.sports } : spot
      ),
    onSuccess: () => {
      triggerHaptic('success');
      toast.success("Sportarten gespeichert");
      onClose();
    },
    onError: () => {
      triggerHaptic('error');
      toast.error("Fehler beim Speichern der Sportarten");
    }
  });

  const handleSave = () => {
    if (!spot || selectedSports.length === 0) {
      toast.error("Bitte waehle mindestens eine Sportart aus");
      triggerHaptic('light');
      return;
    }

    updateSportsMutation.mutate({ id: spot.id, sports: selectedSports });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">
            Sportarten fuer {spot?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {SPORTS.map((sport) => (
            <label
              key={sport}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedSports.includes(sport)}
                onChange={() => toggleSport(sport)}
                className="w-4 h-4 rounded"
                disabled={updateSportsMutation.isPending}
              />
              <span className="text-sm text-gray-300">{sport}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-gray-700"
            disabled={updateSportsMutation.isPending}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-cyan-600 hover:bg-cyan-700"
            disabled={updateSportsMutation.isPending}
          >
            {updateSportsMutation.isPending ? "Speichert..." : "Speichern"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}