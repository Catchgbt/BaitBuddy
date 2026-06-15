import React from 'react';

export default function BiteDetectorInstructions() {
  return (
    <>
      {/* Instructions */}
      <div className="p-4 bg-gray-800/30 rounded-lg text-sm text-gray-400" role="region" aria-label="Bedienungsanleitung fuer KI-Bisserkennung">
        <p className="mb-2">
          <strong className="text-gray-300">Schritt-für-Schritt-Anleitung:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Klicken Sie auf 'Bissanzeiger starten' und bringen Sie die Rute ins Kamerabild</li>
          <li>Markieren Sie die Angelschnur mit der tuerkisen ROI (Region of Interest)</li>
          <li>Markieren Sie die Rutenspitze mit der gelben ROI</li>
          <li>Passen Sie Empfindlichkeit und Sperrzeit nach Bedarf an</li>
          <li>Bei erkanntem Biss: Visueller Alarm + Audio-Signal + Vibration</li>
        </ol>
      </div>

      {/* Sensitivity Explanation */}
      <div className="text-xs text-gray-400 space-y-1" role="region" aria-label="Erklaerug der Empfindlichkeitsstufen">
        <p>
          <span className="font-semibold text-gray-300">Niedrige Sensitivität:</span> Reagiert nur auf starke Bewegungen
        </p>
        <p>
          <span className="font-semibold text-gray-300">Mittlere Sensitivität:</span> Gutes Gleichgewicht zwischen Genauigkeit und Fehlalarmen
        </p>
        <p>
          <span className="font-semibold text-gray-300">Hohe Sensitivität:</span> Erkennt auch kleinste Bewegungen, kann zu Fehlalarmen führen
        </p>
      </div>
    </>
  );
}