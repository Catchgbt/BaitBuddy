import { describe, it, expect } from 'vitest';
import {
  recognitionDetails,
  buildRecognitionNote,
  mergeRecognitionNote,
  AI_NOTE_MARKER,
} from './fishRecognition.js';

const fullResult = {
  species_name: 'Hecht',
  species_latin: 'Esox lucius',
  length_cm: 78,
  weight_kg: 4.2,
  girth_cm: 32,
  bait_used: 'Gummifisch',
  sex: 'weiblich',
  estimated_age_years: 6,
  condition: 'kräftig und gut genährt',
  confidence: 0.88,
};

describe('recognitionDetails', () => {
  it('listet nur tatsächlich erkannte Merkmale (keine Platzhalter)', () => {
    const rows = recognitionDetails({ species_name: 'Zander', length_cm: 50 });
    const labels = rows.map((r) => r.label);
    expect(labels).toContain('Fischart');
    expect(labels).toContain('Länge');
    expect(labels).not.toContain('Gewicht');
    expect(labels).not.toContain('Geschlecht');
  });

  it('formatiert Zahlen mit deutschem Komma und Einheit', () => {
    const rows = recognitionDetails(fullResult);
    const laenge = rows.find((r) => r.label === 'Länge');
    const gewicht = rows.find((r) => r.label === 'Gewicht');
    expect(laenge.value).toBe('78 cm');
    expect(gewicht.value).toBe('4,2 kg');
  });

  it('liefert leere Liste ohne Daten', () => {
    expect(recognitionDetails(null)).toEqual([]);
    expect(recognitionDetails({})).toEqual([]);
  });
});

describe('buildRecognitionNote', () => {
  it('fasst Zusatzmerkmale mit Marker zusammen', () => {
    const note = buildRecognitionNote(fullResult);
    expect(note.startsWith(AI_NOTE_MARKER)).toBe(true);
    expect(note).toContain('Esox lucius');
    expect(note).toContain('Umfang 32 cm');
    expect(note).toContain('Geschlecht weiblich');
    expect(note).toContain('Alter ca. 6 Jahre');
    expect(note).toContain('88% sicher');
  });

  it('gibt leeren String zurück, wenn keine Zusatzmerkmale erkannt wurden', () => {
    expect(buildRecognitionNote({ species_name: 'Hecht', length_cm: 60 })).toBe('');
  });
});

describe('mergeRecognitionNote', () => {
  it('hängt die KI-Notiz an vorhandene Nutzernotizen an', () => {
    const merged = mergeRecognitionNote('Windig, bewölkt', fullResult);
    expect(merged.startsWith('Windig, bewölkt')).toBe(true);
    expect(merged).toContain(AI_NOTE_MARKER);
  });

  it('ersetzt eine frühere KI-Notiz statt sie zu duplizieren', () => {
    const first = mergeRecognitionNote('Meine Notiz', fullResult);
    const second = mergeRecognitionNote(first, { ...fullResult, confidence: 0.5 });
    const markerCount = second.split(AI_NOTE_MARKER).length - 1;
    expect(markerCount).toBe(1);
    expect(second).toContain('Meine Notiz');
    expect(second).toContain('50% sicher');
  });

  it('behält reine Nutzernotizen bei, wenn keine KI-Zusatzdaten vorliegen', () => {
    expect(mergeRecognitionNote('Nur Text', { species_name: 'Hecht' })).toBe('Nur Text');
  });
});
