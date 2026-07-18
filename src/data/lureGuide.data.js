// Datenbasis der 3D-Köderanimation (Seite Koeder3D).
// Technik-Texte sind fachlich konsistent zur Buddy-Wissensbasis
// (backend/src/lib/buddyKnowledge.js), aber bewusst nicht von dort importiert:
// Das Backend-Modul gehört nicht ins Frontend-Bundle, und die Seite muss
// offline vollständig funktionieren.
//
// styles[].params steuert den LureAnimator (alle Zeiten in Sekunden,
// Geschwindigkeiten in Szenen-Einheiten pro Sekunde, Winkel in Radiant):
//   retrieveSpeed  Grundtempo der Einholbewegung
//   depth          Lauftiefe unter der Wasseroberfläche (y = -depth)
//   wobbleFreq     Frequenz der Körper-Roll-Oszillation (Hz)
//   wobbleAmp      Amplitude der Roll-Oszillation
//   pullDuration   Dauer einer Zug-/Kurbelphase
//   pauseDuration  Dauer einer Stopp-/Absinkphase
//   riseRate       Aufstiegsrate schwimmender Köder in der Pause
//   sinkRate       Absinkrate in der Pause (Jig/Blinker)
//   yawAmp         Ausschlag der seitlichen Zick-Zack-Bewegung
//   tailFreq       Grundfrequenz des Schwanzteller-Schlags (Hz)
//   bladeSpin      Blattrotation des Spinners (Umdrehungen/s bei Tempo 1)

export const LURES = [
  {
    id: "wobbler",
    name: "Wobbler",
    model: "wobbler",
    zielfische: ["Hecht", "Zander", "Barsch"],
    kurzbeschreibung:
      "Hartköder mit Tauchschaufel — die Schaufel drückt ihn beim Einholen unter Wasser und erzeugt das typische Wobbeln.",
    montage:
      "Wobbler nie direkt anknoten, sondern per Snap oder Schlaufenknoten (Rapala-Knoten) anbinden, damit er frei spielen kann. Beim Hechtangeln immer ein Stahl- oder dickes Fluorocarbon-Vorfach (mindestens 0,80 mm) vorschalten. Die Tauchtiefe steht meist auf der Verpackung und hängt von der Schaufelgröße ab.",
    bisserkennung:
      "Bisse kommen oft direkt nach dem Stopp — die Pause bringt den Biss. Der Einschlag ist meist deutlich in der Rute zu spüren; bei zaghaften Nachläufern hilft ein kurzer Spinnstopp, um den Fisch zum Zupacken zu bringen.",
    typischeFehler: [
      "Zu schnell und monoton eingeholt — ohne Stopps fehlt der Schlüsselreiz.",
      "Direkt angeknotet statt Snap oder Schlaufenknoten — der Wobbler läuft gebremst.",
      "Ohne Stahlvorfach auf Hecht gefischt — Abbissgefahr.",
    ],
    styles: [
      {
        id: "einleiern",
        name: "Einleiern",
        beschreibung:
          "Gleichmäßig einholen — die Tauchschaufel bringt den Wobbler auf Tiefe und lässt ihn konstant wobbeln. Guter Suchstil, um viel Wasser abzufischen.",
        params: {
          retrieveSpeed: 0.7,
          depth: 1.2,
          wobbleFreq: 8,
          wobbleAmp: 0.32,
        },
      },
      {
        id: "stop_and_go",
        name: "Stop-and-Go",
        beschreibung:
          "Einleiern mit eingebauten Stopps: In der Pause steigt der schwimmende Wobbler langsam auf und taumelt — genau dann kommt der Biss. Beim Anfahren zieht ihn die Schaufel wieder auf Tiefe.",
        params: {
          retrieveSpeed: 0.8,
          depth: 1.2,
          wobbleFreq: 8,
          wobbleAmp: 0.34,
          pullDuration: 2.2,
          pauseDuration: 1.6,
          riseRate: 0.28,
        },
      },
      {
        id: "twitchen",
        name: "Twitchen",
        beschreibung:
          "Kurze Schläge mit der Rutenspitze bei halb lockerer Schnur: Der Wobbler bricht ruckartig nach links und rechts aus, dazwischen Gleitpausen. Imitiert ein fluchtendes, verletztes Beutefischchen.",
        params: {
          retrieveSpeed: 0.55,
          depth: 1.0,
          wobbleFreq: 6,
          wobbleAmp: 0.2,
          pullDuration: 0.35,
          pauseDuration: 1.1,
          yawAmp: 0.7,
          riseRate: 0.1,
        },
      },
    ],
  },
  {
    id: "gummifisch",
    name: "Gummifisch",
    model: "gummifisch",
    zielfische: ["Zander", "Barsch", "Hecht"],
    kurzbeschreibung:
      "Weichplastik-Shad am Jigkopf — der Schwanzteller flankt bei Zug, in der Absinkphase kommt fast immer der Biss.",
    montage:
      "Jighaken passend zur Köderlänge wählen (8 cm ≈ Hakengröße 2/0–3/0, 12 cm ≈ 4/0–5/0). Haken neben den Köder halten, Austrittsstelle markieren und den Gummifisch gerade und faltenfrei aufziehen — ein krummer Gummifisch läuft nicht. Jigkopf-Gewicht nach Faustregel 1 g pro Meter Wassertiefe, plus Zuschlag bei Strömung oder Wind (Barsch 3–7 g, Zander 5–14 g, Hecht 10–30 g). Richtig gewählt ist es, wenn der Köder nach dem Rutenschlag 2–4 Sekunden bis zum Grund braucht. Bei Fehlbissen einen Angsthaken (Stinger) im hinteren Drittel montieren.",
    bisserkennung:
      "Der Biss kommt fast immer in der Absinkphase: Schnurbogen beobachten — zuckt oder springt die Schnur, sofort anschlagen. Auch ein vorzeitiges Erschlaffen der Schnur (Fisch nimmt den Köder im Fallen) ist ein Biss.",
    typischeFehler: [
      "Zu leichter Jigkopf — der Köder bekommt keinen Grundkontakt und die Absinkphase ist nicht lesbar.",
      "Köder krumm aufgezogen — er dreht sich statt zu flanken.",
      "Schnur in der Absinkphase nicht gespannt — Bisse bleiben unbemerkt.",
    ],
    styles: [
      {
        id: "jiggen",
        name: "Jiggen",
        beschreibung:
          "Auswerfen, an gespannter Schnur zum Grund sinken lassen, dann ein Rutenschlag nach oben oder 1–2 schnelle Kurbelumdrehungen — und wieder an straffer Schnur absinken lassen. Der Köder hüpft in Bögen über den Grund.",
        params: {
          retrieveSpeed: 0.9,
          pullDuration: 0.5,
          pauseDuration: 2.6,
          sinkRate: 0.85,
          tailFreq: 7,
        },
      },
      {
        id: "faulenzen",
        name: "Faulenzen",
        beschreibung:
          "Rute ruhig auf etwa 10 Uhr halten und nur über die Rolle beschleunigen: 2–3 rasche Kurbelumdrehungen, dann Pause zum Absinken. Der Lauf ist flacher und gleichmäßiger als beim Jiggen — ideal für Zander im Winter.",
        params: {
          retrieveSpeed: 0.65,
          pullDuration: 1.1,
          pauseDuration: 2.2,
          sinkRate: 0.55,
          tailFreq: 6,
        },
      },
    ],
  },
  {
    id: "spinner",
    name: "Spinner",
    model: "spinner",
    zielfische: ["Barsch", "Forelle", "Hecht"],
    kurzbeschreibung:
      "Rotierendes Metallblatt um eine Drahtachse — Druckwellen und Blitzen reizen Räuber auch in trübem Wasser.",
    montage:
      "Spinner per Snap oder Wirbel anbinden, sonst verdrallt die Rotation die Schnur. Größe nach Zielfisch: Gr. 1–2 für Forelle und Barsch, Gr. 3–4 für Hecht. In Flüssen schräg stromauf werfen und mit der Strömung führen.",
    bisserkennung:
      "Der Biss ist ein harter Schlag in die Rute, weil der Fisch den rotierenden Köder attackiert. Setzt das Blatt kurz aus und die Rute wird schwer, ebenfalls sofort anschlagen.",
    typischeFehler: [
      "Zu schnell eingeholt — das Blatt rotiert hektisch weit über dem Fisch.",
      "Ohne Wirbel gefischt — Schnurdrall bis zur Perücke.",
      "Nach dem Auswurf sofort losgekurbelt, statt den Spinner erst auf Tiefe sinken zu lassen.",
    ],
    styles: [
      {
        id: "einleiern",
        name: "Einleiern",
        beschreibung:
          "Gleichmäßig so langsam einholen, dass das Blatt gerade noch dreht — das ist die fängigste Geschwindigkeit. Nach dem Auswurf Absinkzeit zählen, um verschiedene Tiefen systematisch abzusuchen.",
        params: {
          retrieveSpeed: 0.6,
          depth: 1.1,
          bladeSpin: 6,
          wobbleFreq: 2.5,
          wobbleAmp: 0.08,
        },
      },
    ],
  },
  {
    id: "blinker",
    name: "Blinker",
    model: "blinker",
    zielfische: ["Hecht", "Forelle", "Rapfen"],
    kurzbeschreibung:
      "Gewölbtes Metallblatt ohne Achse — taumelt und blitzt beim Einholen wie ein flüchtender Beutefisch.",
    montage:
      "Blinker per Snap oder Wirbel anbinden, für Hecht mit Stahlvorfach. Die Wölbung bestimmt den Lauf: stark gewölbte Modelle taumeln breit und laufen flach, schlanke Modelle laufen ruhiger und tiefer.",
    bisserkennung:
      "Bisse kommen als harter Ruck während des Einholens oder beim Absinken — fällt der Blinker flatternd, nehmen Räuber ihn oft direkt in der Sinkphase. Bei Kontakt sofort anschlagen.",
    typischeFehler: [
      "Monoton durchgekurbelt — ohne Tempowechsel und Sinkphasen fehlt der Reiz.",
      "Zu schnell geführt — der Blinker rotiert, statt zu taumeln.",
      "Absinkzeit nicht gezählt — immer dieselbe (falsche) Tiefe befischt.",
    ],
    styles: [
      {
        id: "taumeln",
        name: "Taumelnd einholen",
        beschreibung:
          "Langsam und gleichmäßig einholen, sodass der Blinker breit um die Längsachse taumelt und dabei Lichtreflexe wirft. In Flüssen schräg stromauf werfen und mit der Strömung führen.",
        params: {
          retrieveSpeed: 0.65,
          depth: 1.3,
          wobbleFreq: 2.2,
          wobbleAmp: 0.6,
          yawAmp: 0.25,
        },
      },
      {
        id: "absinken",
        name: "Absinken lassen",
        beschreibung:
          "Einholen, dann Kurbelstopp: Der Blinker fällt flatternd zur Seite ab — dieser Flatterlauf in der Sinkphase löst viele Bisse aus. Danach wieder anholen und den Wechsel wiederholen.",
        params: {
          retrieveSpeed: 0.75,
          depth: 1.0,
          wobbleFreq: 2.2,
          wobbleAmp: 0.5,
          pullDuration: 1.8,
          pauseDuration: 1.5,
          sinkRate: 0.7,
          yawAmp: 0.2,
        },
      },
    ],
  },
  {
    id: "topwater",
    name: "Oberflächenköder",
    model: "topwater",
    zielfische: ["Hecht", "Rapfen", "Barsch"],
    kurzbeschreibung:
      "Popper und Stickbait arbeiten direkt an der Wasseroberfläche — die Attacke ist sichtbar und spektakulär.",
    montage:
      "Schwimmenden Oberflächenköder per Snap oder Schlaufenknoten anbinden, für Hecht mit Stahlvorfach. Der Köder bleibt an der Oberfläche; geführt wird ausschließlich über Schläge mit der Rutenspitze bei lockerer Schnur.",
    bisserkennung:
      "Die Attacke ist als Schwall oder Einschlag an der Oberfläche sichtbar. Wichtig: Nach dem Biss erst anschlagen, wenn der Fisch wirklich Druck macht — wer beim Schwall sofort anschlägt, zieht den Köder aus dem Maul.",
    typischeFehler: [
      "Beim sichtbaren Schwall sofort angeschlagen, statt den Druck abzuwarten.",
      "Schnur zu straff — der Stickbait bricht nicht seitlich aus.",
      "Zu hektisch geführt — gerade Popper wirken mit Pausen am besten.",
    ],
    styles: [
      {
        id: "blubbern",
        name: "Popper: Blubbern",
        beschreibung:
          "Kurze Schläge mit der Rutenspitze: Die konkave Maulschale schiebt Wasser und erzeugt das Blubb-Geräusch samt Spritzer. Zwischen den Schlägen Pausen lassen — oft kommt die Attacke in der Ruhephase.",
        params: {
          retrieveSpeed: 0.45,
          pullDuration: 0.3,
          pauseDuration: 1.4,
          wobbleFreq: 3,
          wobbleAmp: 0.12,
        },
      },
      {
        id: "walk_the_dog",
        name: "Stickbait: Walk the Dog",
        beschreibung:
          "Rhythmische kleine Schläge bei lockerer Schnur: Der Stickbait gleitet im Zickzack von links nach rechts über die Oberfläche. Der Takt entsteht aus Schlag und kurzem Nachlassen — nicht aus der Rolle.",
        params: {
          retrieveSpeed: 0.6,
          pullDuration: 0.4,
          pauseDuration: 0.45,
          yawAmp: 0.7,
          wobbleFreq: 2,
          wobbleAmp: 0.1,
        },
      },
    ],
  },
];

export function getLureById(id) {
  return LURES.find((l) => l.id === id) || null;
}

export function getStyleById(lure, styleId) {
  if (!lure) return null;
  return lure.styles.find((s) => s.id === styleId) || null;
}
