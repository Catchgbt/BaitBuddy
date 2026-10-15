// Zentrale Sprachausgabe: eine Sitzung, eine Stimme, eine Wiedergabe.
// Free/Basic verwenden die fest gewählte deutsche Gerätestimme. Premium
// bindet den ersten erfolgreichen Cloud-Provider auch für spätere Antworten.
// Nur vor der ersten Cloud-Ausgabe darf auf die Gerätestimme gewechselt werden.
import { functions } from "@/api/frontendClient";
import { getActiveBuddyAudio, getBuddyVoiceSession, setVoiceTier } from "@/lib/ttsVoice";
import { speakBrowser, cancelBrowserTTS, isBrowserTTSAvailable } from "@/lib/browserTTS";
import { setVoiceSpeaking, isVoiceMuted, subscribeVoiceMuted } from "@/lib/voiceActivity";

let currentPlayback = null;
let generation = 0;

subscribeVoiceMuted((muted) => { if (muted) cancelElevenLabs(); });

export function cancelElevenLabs() {
  generation += 1;
  const playback = currentPlayback;
  // Zuerst abschließen: pause/cancel kann synchrone alte Events auslösen.
  playback?.finish('cancel');
  if (playback) {
    try { playback.handle.pause(); playback.handle.src = ''; } catch { /* noop */ }
  }
  cancelBrowserTTS();
  setVoiceSpeaking(false);
}

function base64ToBlob(audioBase64, contentType) {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType || 'audio/mpeg' });
}

async function fetchSpeechSource(text, myGeneration, session) {
  if (myGeneration !== generation || !getActiveBuddyAudio().voiceEnabled || isVoiceMuted()) return null;
  if (session.browser && isBrowserTTSAvailable()) return { browserText: text };
  try {
    const response = await functions.invoke('textToSpeech', {
      text, preferred_provider: session.provider || undefined,
    });
    if (myGeneration !== generation) return null;
    const payload = response?.audioBase64 ? response : response?.data;
    if (!payload?.audioBase64) throw new Error('TTS lieferte kein Audio');
    if (session.provider && payload.provider !== session.provider) {
      throw new Error('TTS lieferte eine andere Stimme');
    }
    const blob = base64ToBlob(payload.audioBase64, payload.contentType);
    session.provider = payload.provider || session.provider;
    session.cloudSelected = true;
    return blob;
  } catch (err) {
    if (myGeneration !== generation) return null;
    // Keine andere Stimme nach einer erfolgreichen Cloud-Ausgabe. Auch ein
    // späteres 403/502 bleibt still; Text und Gesprächssteuerung laufen weiter.
    if (!session.cloudSelected && isBrowserTTSAvailable()) {
      session.browser = true;
      if (err?.data?.code === 'premium_voice_required' || err?.code === 'premium_voice_required') {
        if (getBuddyVoiceSession() === session) setVoiceTier('browser');
      }
      return { browserText: text };
    }
    throw err;
  }
}

async function playSpeechSource(source, myGeneration, rate, callbacks = {}) {
  if (!source || myGeneration !== generation || !getActiveBuddyAudio().voiceEnabled || isVoiceMuted()) return null;
  const browser = !!source.browserText;
  const url = browser ? null : URL.createObjectURL(source);
  let handle;
  try { handle = browser ? speakBrowser(source.browserText, { rate }) : new Audio(url); }
  catch (err) { if (url) URL.revokeObjectURL(url); throw err; }

  let settle;
  const finished = new Promise(resolve => { settle = resolve; });
  let done = false;
  const playback = {
    handle,
    finish(kind, event) {
      if (done) return;
      done = true;
      if (url) URL.revokeObjectURL(url);
      if (currentPlayback === playback) {
        currentPlayback = null;
        setVoiceSpeaking(false);
      }
      settle();
      if (myGeneration !== generation || kind === 'cancel') return;
      if (kind === 'end') callbacks.onEnd?.();
      else callbacks.onError?.(event);
    },
  };
  currentPlayback = playback;
  handle.finished = finished;
  handle.onended = e => playback.finish('end', e);
  handle.onerror = e => playback.finish('error', e);
  if (Number.isFinite(rate) && rate >= 0.5 && rate <= 2) handle.playbackRate = rate;
  setVoiceSpeaking(true);
  if (!browser) {
    try { await Promise.race([handle.play(), finished]); }
    catch (err) {
      playback.finish('error', err);
      if (myGeneration !== generation) return null;
      throw err;
    }
  }
  if (myGeneration !== generation) return null;
  return handle;
}

/** Spielt einen Text; `finished` endet auch bei Stop/Ersetzen ohne ended-Event. */
export async function speakWithElevenLabs(text, callbacks = {}, options = {}) {
  if (!getActiveBuddyAudio().voiceEnabled || isVoiceMuted()) return null;
  if (typeof text !== 'string' || !text.trim()) throw new Error('Kein Text für TTS');
  cancelElevenLabs();
  const myGeneration = generation;
  const session = getBuddyVoiceSession();
  const source = await fetchSpeechSource(text, myGeneration, session);
  return playSpeechSource(source, myGeneration, (options.rate || 1) * getActiveBuddyAudio().speed, callbacks);
}

/** Wartet auf Ende oder Abbruch; bei Fehlern bleibt der Antworttext verfügbar. */
export async function speakWithFallback(text, options = {}) {
  if (typeof text !== 'string' || !text.trim() || options.voiceEnabled === false) return;
  try {
    const audio = await speakWithElevenLabs(text, {}, { rate: options.rate || 1 });
    await audio?.finished;
  } catch (err) {
    console.warn('[TTS] Sprachausgabe nicht verfügbar:', err?.message);
  }
}

// ── Satzweise Streaming-Wiedergabe (Time-to-first-Audio senken) ──────────────
//
// Statt die komplette Antwort als EINEN TTS-Blob zu synthetisieren und erst
// danach abzuspielen, zerlegt die Queue den (ggf. gestreamten) Text in Sätze:
// Der erste Satz spricht sofort, während die nächsten schon im Hintergrund
// synthetisiert werden (Pipelining). Das macht die Sprachausgabe spürbar „live".

const SENTENCE_TERMINATORS = '.!?…';
// Schließende Anführungszeichen/Klammern, die noch zum Satz gehören.
const SENTENCE_TRAILING = '"\')]}“’';
// Mindestlänge eines Satz-Chunks: verhindert zerhackte Ein-Wort-Fetzen
// (z. B. „Ja." als eigener TTS-Call) — kurze Sätze werden mit dem nächsten
// zusammengefasst.
const MIN_SENTENCE_LENGTH = 25;

/**
 * Zerlegt Text an Satzgrenzen (Satzzeichen gefolgt von Whitespace/Ende sowie
 * Zeilenumbrüchen). Zu kurze Fragmente werden mit dem Folgesatz verschmolzen.
 * Nicht als Abkürzungen/Dezimalzahlen splitten (Satzzeichen ohne folgendes
 * Whitespace, z. B. „z.B." oder „3.5", ist keine Grenze).
 *
 * @param {string} text
 * @param {{ flush?: boolean, minLength?: number }} [opts]
 *   flush=true → der verbleibende Rest wird als letzter Satz zurückgegeben.
 * @returns {{ sentences: string[], rest: string }}
 */
export function splitIntoSentences(text, opts = {}) {
  const { flush = false, minLength = MIN_SENTENCE_LENGTH } = opts;
  const sentences = [];
  const n = text.length;
  let start = 0;
  let i = 0;

  const isSpace = (c) => c === undefined || /\s/.test(c);
  const pushChunk = (endExclusive) => {
    const chunk = text.slice(start, endExclusive).trim();
    if (chunk) sentences.push(chunk);
    start = endExclusive;
    // Führende Whitespaces des nächsten Satzes überspringen.
    while (start < n && /\s/.test(text[start])) start++;
    i = start;
  };

  while (i < n) {
    const ch = text[i];

    if (SENTENCE_TERMINATORS.includes(ch)) {
      // Aufeinanderfolgende Satzzeichen + schließende Zeichen konsumieren.
      let j = i + 1;
      while (j < n && (SENTENCE_TERMINATORS.includes(text[j]) || SENTENCE_TRAILING.includes(text[j]))) j++;
      // Grenze nur, wenn danach Whitespace/Ende folgt (sonst Abkürzung/Zahl).
      if (isSpace(text[j]) && text.slice(start, j).trim().length >= minLength) {
        pushChunk(j);
        continue;
      }
      i = j;
      continue;
    }

    if (ch === '\n') {
      if (text.slice(start, i).trim().length >= minLength) {
        pushChunk(i);
        continue;
      }
    }
    i++;
  }

  let rest = text.slice(start);
  if (flush) {
    const trimmed = rest.trim();
    if (trimmed) sentences.push(trimmed);
    rest = '';
  }
  return { sentences, rest };
}

// Wiedergabe-Ende und Abbruch verwenden denselben Abschluss wie Einzelansagen.
async function playSentenceBlob(source, myGeneration, rate) {
  try {
    const audio = await playSpeechSource(source, myGeneration, rate);
    await audio?.finished;
  } catch { /* Text bleibt sichtbar, Queue wird regulär abgeschlossen. */ }
}

/**
 * Erzeugt eine Sprech-Queue für satzweise, pipelined Wiedergabe.
 *
 * Nutzung (Streaming): für jedes Text-Delta `push(delta)`, am Ende `flush()`.
 * Nutzung (Ganztext): `push(fullText)` gefolgt von `flush()`.
 * Ein neuer speak-/cancel-Aufruf (Generation-Token) oder `cancel()` bricht
 * die Queue sofort ab.
 *
 * @param {{ rate?: number, onDrain?: () => void }} [options]
 * @returns {{ push: (chunk: string) => void, flush: () => void, cancel: () => void }}
 */
export function createSpeechQueue(options = {}) {
  const { onDrain } = options;
  const rate = (options.rate || 1) * getActiveBuddyAudio().speed;

  // Wie speakWithElevenLabs: laufende Wiedergabe abbrechen und eigene
  // Generation beanspruchen. Ein späterer speak-/cancel-/Queue-Aufruf bumpt
  // generation weiter und deaktiviert diese Queue.
  cancelElevenLabs();
  const myGeneration = generation;

  // Auch Einzelansagen und spätere Antworten teilen diese Auswahl.
  const session = getBuddyVoiceSession();

  let textBuffer = "";
  const queue = [];          // fertige Sätze in Reihenfolge
  let headBlobPromise = null; // Prefetch für queue[0] (Tiefe 1 → keine Lücken)
  let running = false;
  let closed = false;
  let drained = false;

  const isActive = () => myGeneration === generation;

  function ensureHeadPrefetch() {
    if (!headBlobPromise && queue.length > 0 && isActive()) {
      // Fehler abfangen, damit ein Reject nicht als Unhandled Rejection endet;
      // die Wiedergabeschleife wertet das Ergebnis (null) aus.
      headBlobPromise = fetchSpeechSource(queue[0], myGeneration, session).catch(() => null);
    }
  }

  function maybeDrain() {
    if (isActive() && closed && !running && queue.length === 0 && textBuffer === "" && !drained) {
      drained = true;
      onDrain?.();
    }
  }

  async function runLoop() {
    if (running) return;
    running = true;
    try {
      while (isActive() && queue.length > 0) {
        ensureHeadPrefetch();
        const blobPromise = headBlobPromise;
        headBlobPromise = null;
        queue.shift();
        const blob = await blobPromise;
        if (!isActive()) return;
        // Erst steht die Stimme fest, dann den nächsten Satz vorladen. Die
        // Synthese läuft weiterhin parallel zur Wiedergabe des aktuellen Satzes.
        ensureHeadPrefetch();
        if (blob) {
          await playSentenceBlob(blob, myGeneration, rate);
          if (!isActive()) return;
        }
      }
    } finally {
      running = false;
      maybeDrain();
    }
  }

  function enqueueComplete(force) {
    const { sentences, rest } = splitIntoSentences(textBuffer, { flush: force });
    textBuffer = rest;
    for (const s of sentences) queue.push(s);
  }

  return {
    push(chunk) {
      if (closed || !isActive() || !chunk) return;
      textBuffer += chunk;
      enqueueComplete(false);
      runLoop();
    },
    flush() {
      if (closed || !isActive()) return;
      closed = true;
      enqueueComplete(true);
      if (running) return; // laufende Schleife ruft am Ende maybeDrain()
      runLoop().then(maybeDrain);
      maybeDrain(); // Fall: nichts zu sprechen → sofort drainen
    },
    cancel() {
      if (isActive()) cancelElevenLabs();
    },
  };
}
