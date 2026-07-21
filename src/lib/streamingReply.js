// Hilfsfunktion fürs Live-Streaming der KI-Buddy-Antwort.
//
// Der Server streamt die rohe LLM-Ausgabe, die am Ende einen Aktions-Block
// enthalten kann (`<<ACTION>>{...}<<END>>` oder als Fallback nackte
// `{"type":...}`-JSON). Beim satzweisen Anzeigen/Vorlesen darf dieser Block
// weder kurz aufblitzen (Anzeige) noch gesprochen werden (TTS). Diese Funktion
// liefert nur den sichtbaren Teil VOR dem Aktions-Block und hält zusätzlich
// einen über die Delta-Grenze angefangenen Marker (`<<AC…`) zurück, bis klar
// ist, ob es wirklich der Aktions-Block wird.
//
// Spiegelt bewusst die serverseitige extractAction-Erkennung (backend/src/
// routes/ai.js), damit Client-Anzeige und finaler `done`-cleanReply konsistent
// sind.

const ACTION_MARKER = '<<ACTION>>';

/**
 * @param {string} text akkumulierter Rohtext aus den Stream-Deltas
 * @returns {string} sichtbarer Teil (ohne Aktions-Block, ohne angefangenen Marker)
 */
export function stripActionMarker(text) {
  if (!text) return '';

  const markerIdx = text.indexOf(ACTION_MARKER);
  const bareIdx = text.search(/\{\s*"type"\s*:/);
  const candidates = [markerIdx, bareIdx].filter((i) => i !== -1);
  const cut = candidates.length ? Math.min(...candidates) : text.length;

  let visible = text.slice(0, cut);

  // Über Delta-Grenzen angefangener Marker: ein Tail wie "<", "<<", "<<AC"
  // zurückhalten, wenn er ein echtes Präfix von "<<ACTION>>" ist.
  const lt = visible.lastIndexOf('<');
  if (lt !== -1) {
    const tail = visible.slice(lt);
    if (ACTION_MARKER.startsWith(tail)) {
      visible = visible.slice(0, lt);
    }
  }

  return visible;
}
