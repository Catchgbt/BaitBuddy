
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function ARTutorial({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Willkommen zur AR-Ansicht!",
      description: "Erlebe deine Angelgewässer in 3D mit Augmented Reality."
    },
    {
      title: "Kamera ausrichten",
      description: "Richte deine Kamera auf einen flachen Untergrund oder Tisch."
    },
    {
      title: "Touch-Steuerung",
      description: "Ziehe mit einem Finger, um das Gewässer zu drehen. Mit zwei Fingern kannst du zoomen."
    },
    {
      title: "Tiefenprofil",
      description: "Die Farben zeigen die Wassertiefe: Blau = tief, Grün = mittel, Gelb = flach."
    },
    {
      title: "KI-Tipps",
      description: "Tippe auf Bereiche, um KI-Empfehlungen für beste Angelstellen zu erhalten."
    },
    {
      title: "Spot speichern",
      description: "Markiere interessante Stellen direkt auf der Karte und speichere sie."
    }
  ];

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }} // Added exit animation for the modal content
          className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-cyan-500/30"
        >
          <div className="mb-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-cyan-400 mb-2">
                {steps[currentStep].title}
              </h2>
              <p className="text-gray-300 text-sm">
                {steps[currentStep].description}
              </p>
            </div>

            {/* Progress Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-cyan-400'
                      : 'w-2 bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrev}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600"
              >
                Zurück
              </Button>
            )}
            <Button
              onClick={currentStep === steps.length - 1 ? onClose : handleNext}
              className={`flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white ${currentStep === 0 ? 'w-full' : ''}`}
            >
              {currentStep === steps.length - 1 ? 'Los geht\'s!' : 'Weiter'}
            </Button>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm mt-4 w-full text-center"
          >
            Tutorial überspringen
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
