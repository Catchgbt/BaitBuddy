import { useState } from 'react';

const BUNDESLAENDER = [
  'Alle Bundesländer',
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
];

// Bundesweit übliche Richtwerte – lokal können Abweichungen gelten
const FISCHE = [
  {
    art: 'Hecht',
    emoji: '🐟',
    schonzeit: '1. Feb – 30. Apr',
    mindestmaß: '50 cm',
    kategorie: 'Raubfisch',
    hinweis: 'In manchen Ländern (z.B. BY) bis 30. Apr, in anderen bis 30. Mai.',
    bundeslaender: ['Alle Bundesländer'],
  },
  {
    art: 'Zander',
    emoji: '🐟',
    schonzeit: '1. Feb – 30. Apr',
    mindestmaß: '45–50 cm',
    kategorie: 'Raubfisch',
    hinweis: 'Mindestmaß je nach Bundesland 45 oder 50 cm.',
    bundeslaender: ['Alle Bundesländer'],
  },
  {
    art: 'Barsch',
    emoji: '🐟',
    schonzeit: 'Keine bundesweite Schonzeit',
    mindestmaß: '15–25 cm',
    kategorie: 'Raubfisch',
    hinweis: 'Regional können Schonzeiten und Mindestmaße abweichen.',
    bundeslaender: ['Alle Bundesländer'],
  },
  {
    art: 'Forelle (Bach)',
    emoji: '🐠',
    schonzeit: '1. Okt – 28. Feb',
    mindestmaß: '25–30 cm',
    kategorie: 'Salmoniden',
    hinweis: 'Schonzeit variiert stark je nach Gewässer und Bundesland.',
    bundeslaender: ['Alle Bundesländer'],
  },
  {
    art: 'Forelle (Regen- & See-)',
    emoji: '🐠',
    schonzeit: '1. Okt – 31. Jan',
    mindestmaß: '30–35 cm',
    kategorie: 'Salmoniden',
    hinweis: 'Regenbogenforelle teils keine Schonzeit bei Besatz.',
    bundeslaender: ['Alle Bundesländer'],
  },
  {
    art: 'Lachs',
    emoji: '🐠',
    schonzeit: '1. Okt – 28. Feb',
    mindestmaß: '60 cm',
    kategorie: 'Salmoniden',
    hinweis: 'Streng geschützt – vor dem Fang Genehmigung prüfen.',
    bundeslaender: ['Alle Bundesländer'],
  },
  {
    art: 'Äsche',
    emoji: '🐠',
    schonzeit: '1. März – 30. Apr',
    mindestmaß: '30–35 cm',
    kategorie: 'Salmoniden',
    hinweis: 'In vielen Gewässern ganzjährig geschützt oder C&R-Pflicht.',
    bundeslaender: ['Alle Bundesländer'],
  },
  {
    art: 'Karpfen',
    emoji: '🐡',
    schonzeit: '1. Apr – 31. Mai',
    mindestmaß: '30–35 cm',
    kategorie: 'Karpfenartige',
    hinweis: 'Sehr unterschiedlich je nach Gewässer und Pächter.',
    bundeslaender: ['Alle Bundesländer'],
  },
  {
    art: 'Schleie',
    emoji: '🐡',
    schonzeit: '1. Apr – 30. Juni',
    mindestmaß: '25 cm',
    kategorie: 'Karpfenartige',
    hinweis: 'Regional können Abweichungen gelten.',
    bundeslaender: ['Alle Bundesländer'],
  },
  {
    art: 'Aal',
    emoji: '🐍',
    schonzeit: 'Keine bundesweite Schonzeit',
    mindestmaß: '40–45 cm',
    kategorie: 'Sonstige',
    hinweis: 'Regional gesperrt; stark gefährdet – Konsum prüfen.',
    bundeslaender: ['Alle Bundesländer'],
  },
  {
    art: 'Wels',
    emoji: '🐡',
    schonzeit: '1. Apr – 30. Juni',
    mindestmaß: '60–70 cm',
    kategorie: 'Sonstige',
    hinweis: 'Mindestmaß je nach Bundesland sehr unterschiedlich.',
    bundeslaender: ['Alle Bundesländer'],
  },
  {
    art: 'Brachse / Blei',
    emoji: '🐡',
    schonzeit: '15. Mai – 15. Juni',
    mindestmaß: '30 cm',
    kategorie: 'Karpfenartige',
    hinweis: 'Schonzeit je nach Region abweichend.',
    bundeslaender: ['Alle Bundesländer'],
  },
];

const KATEGORIEN = ['Alle', 'Raubfisch', 'Salmoniden', 'Karpfenartige', 'Sonstige'];

const MONAT_HEUTE = new Date().getMonth() + 1; // 1-12

function isInSchonzeit(schonzeit) {
  if (schonzeit.startsWith('Keine')) return false;
  try {
    const monatMap = {
      Jan: 1, Feb: 2, Mär: 3, März: 3, Apr: 4, Mai: 5, Jun: 6, Juni: 6,
      Jul: 7, Aug: 8, Sep: 9, Okt: 10, Nov: 11, Dez: 12,
    };
    const parts = schonzeit.split('–').map(s => s.trim());
    const startTag = parts[0].split('. ');
    const endTag = parts[1].split('. ');
    const startM = monatMap[startTag[1]];
    const endM = monatMap[endTag[1]];
    if (!startM || !endM) return false;
    if (startM <= endM) return MONAT_HEUTE >= startM && MONAT_HEUTE <= endM;
    return MONAT_HEUTE >= startM || MONAT_HEUTE <= endM;
  } catch {
    return false;
  }
}

export default function Schonzeiten() {
  const [bundesland, setBundesland] = useState('Alle Bundesländer');
  const [kategorie, setKategorie] = useState('Alle');
  const [nurAktuell, setNurAktuell] = useState(false);

  const visible = FISCHE.filter(f => {
    if (kategorie !== 'Alle' && f.kategorie !== kategorie) return false;
    if (nurAktuell && !isInSchonzeit(f.schonzeit)) return false;
    return true;
  });

  return (
    <div className="p-5 space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">Schonzeiten & Maße</h1>
        <p className="text-gray-500 text-sm mt-1">Richtwerte für Deutschland – lokale Regeln prüfen!</p>
      </div>

      {/* Bundesland-Auswahl */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Bundesland</label>
        <select
          value={bundesland}
          onChange={e => setBundesland(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-cyan-500"
        >
          {BUNDESLAENDER.map(bl => (
            <option key={bl} value={bl}>{bl}</option>
          ))}
        </select>
      </div>

      {/* Filter-Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {KATEGORIEN.map(k => (
          <button
            key={k}
            onClick={() => setKategorie(k)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              kategorie === k
                ? 'bg-cyan-600 border-cyan-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Toggle: aktuell gesperrt */}
      <button
        onClick={() => setNurAktuell(v => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
          nurAktuell
            ? 'bg-red-900/40 border-red-700 text-red-400'
            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
        }`}
      >
        <span className={`w-3 h-3 rounded-full ${nurAktuell ? 'bg-red-400' : 'bg-gray-600'}`} />
        Nur aktuell gesperrte Arten
      </button>

      {/* Tabelle */}
      <div className="space-y-2.5">
        {visible.length === 0 && (
          <div className="text-center py-10 text-gray-600 text-sm">
            Keine Einträge für diese Filter.
          </div>
        )}
        {visible.map(f => {
          const gesperrt = isInSchonzeit(f.schonzeit);
          return (
            <div
              key={f.art}
              className={`rounded-2xl border p-4 space-y-2 ${
                gesperrt
                  ? 'bg-red-950/30 border-red-800/50'
                  : 'bg-gray-900 border-gray-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{f.emoji}</span>
                    <span className="text-white font-semibold text-sm">{f.art}</span>
                    {gesperrt && (
                      <span className="text-xs bg-red-800/60 text-red-300 px-2 py-0.5 rounded-lg font-medium">
                        Schonzeit!
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 ml-8">{f.kategorie}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400 font-medium">Mindestmaß</p>
                  <p className="text-cyan-400 font-bold text-sm">{f.mindestmaß}</p>
                </div>
              </div>

              <div className="flex gap-4 pl-1">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wider">Schonzeit</p>
                  <p className={`text-sm font-medium mt-0.5 ${gesperrt ? 'text-red-400' : 'text-gray-300'}`}>
                    {f.schonzeit}
                  </p>
                </div>
              </div>

              {f.hinweis && (
                <p className="text-xs text-gray-500 leading-relaxed pl-1">{f.hinweis}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-amber-900/20 border border-amber-700/30 px-4 py-3 mt-2">
        <p className="text-amber-400 text-xs leading-relaxed">
          <span className="font-bold">Wichtig: </span>
          Diese Angaben sind allgemeine Richtwerte. Schonzeiten und Mindestmaße können je nach Bundesland,
          Gewässer und Pächter abweichen. Stets den gültigen Fischereiausweis und die lokale Fischereiordnung beachten.
        </p>
      </div>

      <p className="text-center text-gray-700 text-xs pb-4">
        Stand: 2024 · Angaben ohne Gewähr
      </p>
    </div>
  );
}
