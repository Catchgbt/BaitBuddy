import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const knots = [
  {
    id: 'palomar',
    name: 'Palomar-Knoten',
    use: 'Haken, Wirbel, Karabiner – universeller Allrounder',
    difficulty: 'Einfach',
    diffColor: 'text-emerald-400',
    steps: [
      'Führe ca. 20 cm Schnur doppelt durch das Öhr des Hakens.',
      'Mache mit der Doppelschlaufe einen einfachen Überhandknoten (locker lassen).',
      'Ziehe die Schlaufe über den Haken hinweg.',
      'Befeuchte den Knoten und ziehe beide Schnurenden gleichmäßig fest.',
      'Schneide den überstehenden Rest auf ca. 2 mm ab.',
    ],
    tip: 'Funktioniert bei Fluorocarbon, Mono und Geflecht gleich gut.',
  },
  {
    id: 'clinch',
    name: 'Improved Clinch',
    use: 'Haken & Wirbel mit monofilamentarer Schnur',
    difficulty: 'Einfach',
    diffColor: 'text-emerald-400',
    steps: [
      'Führe ca. 15 cm Schnur durch das Öhr.',
      'Schlinge das Schnurende 5–6 Mal um den Hauptstrang.',
      'Führe das Ende durch die erste Schlaufe direkt am Öhr.',
      'Führe das Ende dann durch die große Schlaufe zurück.',
      'Befeuchte und ziehe den Knoten vorsichtig fest.',
    ],
    tip: 'Bei geflochtener Schnur lieber den Palomar verwenden.',
  },
  {
    id: 'uni',
    name: 'Uni-Knoten (Grinner)',
    use: 'Haken, Wirbel, Verbinden von zwei Schnüren',
    difficulty: 'Mittel',
    diffColor: 'text-yellow-400',
    steps: [
      'Lege 20–25 cm Schnur parallel zum Hauptstrang (Schlaufe nach unten).',
      'Wickle das Ende 5–6 Mal durch die Schlaufe und um beide Stränge.',
      'Befeuchte und ziehe das Ende fest, sodass sich die Wicklung zusammenzieht.',
      'Schiebe den Knoten an das Öhr heran.',
      'Abschließend fest anziehen und Restschnur kürzen.',
    ],
    tip: 'Zwei Uni-Knoten gegeneinander = zuverlässige Schnurverbindung (Double-Uni).',
  },
  {
    id: 'loop',
    name: 'Perfection-Schlaufe',
    use: 'Vorfach anlegen, Loop-to-Loop-Verbindungen',
    difficulty: 'Mittel',
    diffColor: 'text-yellow-400',
    steps: [
      'Bilde eine erste Schlaufe (A) und halte sie zwischen Daumen und Zeigefinger.',
      'Lege eine zweite Schlaufe (B) vor die erste.',
      'Führe das Schnurende zwischen beide Schlaufen hindurch.',
      'Ziehe Schlaufe B durch Schlaufe A.',
      'Befeuchte und ziehe beide Enden gleichmäßig fest.',
    ],
    tip: 'Ergibt eine gerade Schlaufe – ideal für Fliegenfischer.',
  },
  {
    id: 'blood',
    name: 'Blut-Knoten (Blood Knot)',
    use: 'Zwei Schnüre ähnlichen Durchmessers verbinden',
    difficulty: 'Schwer',
    diffColor: 'text-red-400',
    steps: [
      'Lege beide Schnurenden ca. 20 cm überlappend nebeneinander.',
      'Wickle Ende A 5-mal um Schnur B (von der Mitte nach außen).',
      'Führe Ende A durch die Mittelschlaufe.',
      'Wiederhole Schritt 2–3 mit Ende B (in die entgegengesetzte Richtung).',
      'Befeuchte großzügig und ziehe beide Außenenden gleichzeitig fest.',
    ],
    tip: 'Beim Festziehen sehr langsam vorgehen – der Knoten kann bei zu schnellem Zug brechen.',
  },
  {
    id: 'snell',
    name: 'Snell-Knoten',
    use: 'Haken ohne Öhr (Spade-Haken) oder für mehr Hakenkraft',
    difficulty: 'Schwer',
    diffColor: 'text-red-400',
    steps: [
      'Führe Schnur entlang des Hakenschafts (Öhr oben, Spitze unten).',
      'Bilde eine Schlaufe neben dem Schaft.',
      'Wickle das Schnurende 7–10 Mal eng um Schaft UND Schlaufe.',
      'Führe das Ende durch die verbleibende Schlaufe am Öhr.',
      'Befeuchte und ziehe das Hauptschnurende fest.',
    ],
    tip: 'Besonders effektiv bei Pose-Angeln und Karpfenmontagen.',
  },
];

const DIFF_ORDER = { Einfach: 0, Mittel: 1, Schwer: 2 };

export default function Knots() {
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState('Alle');

  const filters = ['Alle', 'Einfach', 'Mittel', 'Schwer'];
  const visible = filter === 'Alle' ? knots : knots.filter(k => k.difficulty === filter);

  return (
    <div className="p-5 space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">Knoten-Bibliothek</h1>
        <p className="text-gray-500 text-sm mt-1">Schritt-für-Schritt Anleitungen für Angelknoten</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              filter === f
                ? 'bg-cyan-600 border-cyan-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Knoten-Liste */}
      <div className="space-y-3">
        {visible.map(knot => (
          <div key={knot.id} className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
            <button
              onClick={() => setOpen(open === knot.id ? null : knot.id)}
              className="w-full flex items-start justify-between p-4 text-left"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">{knot.name}</span>
                  <span className={`text-xs font-medium ${knot.diffColor}`}>{knot.difficulty}</span>
                </div>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{knot.use}</p>
              </div>
              {open === knot.id ? (
                <ChevronUp size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
              ) : (
                <ChevronDown size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
              )}
            </button>

            {open === knot.id && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-800 pt-3">
                <ol className="space-y-2.5">
                  {knot.steps.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-900/50 border border-cyan-700/50 text-cyan-400 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <p className="text-gray-300 text-sm leading-relaxed pt-0.5">{step}</p>
                    </li>
                  ))}
                </ol>
                {knot.tip && (
                  <div className="rounded-xl bg-amber-900/20 border border-amber-700/30 px-3 py-2.5">
                    <p className="text-amber-400 text-xs leading-relaxed">
                      <span className="font-semibold">Tipp: </span>{knot.tip}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-gray-600 text-xs pt-2 pb-4">
        Alle Knoten vor dem Einsatz immer befeuchten!
      </p>
    </div>
  );
}
