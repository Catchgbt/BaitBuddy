import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function FirstLoginTutorialPrompt() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      try {
        const user = await base44.auth.me();
        if (user && !user.tutorial_prompt_seen) {
          setOpen(true);
        }
      } catch {
        // nicht eingeloggt - ignorieren
      }
    };
    check();
  }, []);

  const markSeen = async () => {
    try {
      await base44.auth.updateMe({ tutorial_prompt_seen: true });
    } catch (e) {
      console.warn("Konnte tutorial_prompt_seen nicht speichern", e);
    }
  };

  const handleStartTutorial = async () => {
    setOpen(false);
    await markSeen();
    navigate(createPageUrl("Tutorials"));
  };

  const handleSkip = async () => {
    setOpen(false);
    await markSeen();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleSkip(); }}>
      <DialogContent className="bg-gray-900 border border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cyan-400 text-xl">
            Willkommen bei CatchGBT
          </DialogTitle>
          <DialogDescription className="text-gray-300 pt-2">
            Moechtest du eine kurze Einfuehrung sehen, um die wichtigsten Funktionen kennenzulernen?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Spaeter
          </Button>
          <Button
            onClick={handleStartTutorial}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
          >
            Tutorial starten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}