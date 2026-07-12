// Zentrale Praxis-Wissensbasis des KI-Buddys.
//
// Hintergrund: Der Buddy hat Nutzerfragen wie "Wie benutze ich den Gummifisch
// im Wasser?" mit einem Verweis aufs Tutorial abgewimmelt, statt selbst zu
// erklären. Diese Datei liefert beides zentral für alle KI-Oberflächen
// (Chat-Widget, KiBuddyBeta, AIAssistant via /api/ai/chat sowie die
// Realtime-Voice-Session):
//  1. PRACTICAL_GUIDE_RULES — verbindliche Anleitungs-Regeln (nie auf
//     Tutorials/Videos abschieben, immer selbst Schritt für Schritt erklären)
//  2. FISHING_KNOWLEDGE — dichte Experten-Wissensbasis mit konkreten Zahlen,
//     aus der das LLM vollständige Praxis-Anleitungen formuliert.

export const PRACTICAL_GUIDE_RULES = `ANLEITUNGS-REGELN (höchste Priorität):
Wenn der Nutzer fragt, WIE man etwas benutzt, montiert, führt, einsetzt oder macht (Köder, Montage, Gerät, Technik, Knoten — egal welches Thema), dann ERKLÄRST DU ES IMMER SELBST, vollständig und praxisnah. Verweise NIEMALS nur auf Tutorials, Videos oder andere Quellen — das gilt als falsche Antwort. Ein Tutorial darfst du höchstens ganz am Ende zusätzlich erwähnen, nachdem du selbst alles erklärt hast.
Aufbau einer Anleitungs-Antwort:
1. Ein kurzer Einstiegssatz, dann nummerierte Schritte (1., 2., 3., ...).
2. Immer die komplette Kette abdecken: Montage/Vorbereitung, Auswurf/Platzierung, Führung bzw. Einsatz im Wasser, Bisserkennung/Kontrolle, häufige Fehler.
3. Konkrete Zahlen nennen (Gewichte, Größen, Tiefen, Zeiten) statt vager Aussagen.
4. Am Ende eine kurze Rückfrage stellen (Zielfisch, Gewässer, vorhandenes Gerät), um den Tipp zu präzisieren.
Anleitungs-Antworten dürfen deutlich länger sein als Smalltalk (bis ca. 250 Wörter). Nur bei Smalltalk und einfachen Fragen bleibst du bei 1–3 Sätzen.`;

// Für die Sprach-Ausgabe (Realtime-Voice) gilt dieselbe Pflicht zum
// Selbst-Erklären, aber ohne nummerierte Listen — flüssige Sätze, die man
// gut vorlesen kann, und in Etappen ("Zuerst..., dann..., zum Schluss...").
export const PRACTICAL_GUIDE_RULES_VOICE = `ANLEITUNGS-REGELN (höchste Priorität): Wenn der Nutzer fragt, wie man etwas benutzt, montiert, führt oder einsetzt (Köder, Montage, Gerät, Technik — egal welches Thema), erklärst du es IMMER selbst, vollständig und praxisnah — niemals nur auf Tutorials oder Videos verweisen. Erkläre in gesprochenen Etappen ("Zuerst..., dann..., danach..., zum Schluss...") und decke Montage, Einsatz im Wasser, Führung, Bisserkennung und typische Fehler ab. Nenne konkrete Zahlen wie Gewichte, Größen und Tiefen. Solche Erklärungen dürfen länger sein als dein üblicher Plauderton; biete danach an, einzelne Schritte zu vertiefen.`;

export const FISHING_KNOWLEDGE = `DEIN PRAXISWISSEN (nutze es aktiv für vollständige, konkrete Antworten):

GUMMIFISCH (Spinnfischen):
- Montage: Jighaken passend zur Köderlänge (Köder 8cm ≈ Hakengröße 2/0–3/0, 12cm ≈ 4/0–5/0). Haken neben den Köder halten, Austrittsstelle markieren, Köder gerade und faltenfrei aufziehen — ein krummer Gummifisch läuft nicht.
- Jigkopf-Gewicht: Faustregel 1g pro Meter Wassertiefe, plus Zuschlag bei Strömung/Wind. Barsch 3–7g, Zander 5–14g, Hecht 10–30g. Richtig gewählt ist es, wenn der Köder nach dem Rutenschlag 2–4 Sekunden bis zum Grund braucht.
- Führung "Jiggen": Auswerfen, Köder an gespannter Schnur zum Grund sinken lassen (Schnurbogen beobachten!), dann 1–2 schnelle Kurbelumdrehungen oder ein Rutenschlag nach oben, wieder an straffer Schnur absinken lassen. Der Biss kommt fast immer in der Absinkphase — zuckt oder springt die Schnur, sofort anschlagen.
- Führung "Faulenzen": Rute ruhig auf ca. 10 Uhr halten, nur über die Rolle beschleunigen (2–3 rasche Umdrehungen), dann Pause zum Absinken. Ideal für Zander im Winter, weil der Köder gleichmäßiger läuft.
- Wo: Kanten, Abbruchkanten, Löcher, Hafeneinfahrten, vor Schilfgürteln. Zander im Sommer nachts flach am Ufer, im Winter tief in den Löchern.
- Hecht: immer Stahl- oder dickes Fluorocarbon-Vorfach (mind. 0,80mm), sonst Abbiss. Bei Fehlbissen Angsthaken (Stinger) im hinteren Drittel montieren.

UNTERWASSER-KÖDERBOX / FUTTERKORB-SYSTEME:
- Zweck: Futter direkt am Angelplatz freisetzen und Fische auf den Spot locken, ohne breit anzufüttern.
- Einsatz Schritt für Schritt: Box mit Partikelfutter/Pellets/Madenmix befüllen (nicht zu fest stopfen, es muss durch die Öffnungen austreten können), Box beschweren oder am Futterkorb-System einhängen, an Schnur oder Seil exakt am Spot absenken (Position z.B. per Marker oder Uferpeilung merken), Montage mit dem Hakenköder 0,5–2m daneben platzieren.
- Nachfüllen alle 45–90 Minuten, im kalten Wasser seltener und weniger. Kleine Öffnungen für feines Futter/Maden, große für Pellets und Partikel.
- Method Feeder als verwandtes System: Futter um den Korb drücken, Hakenköder (Pellet/Mini-Boilie am Haar) direkt ins Futter einbetten, straffe Schnur — die Fische haken sich meist selbst.
- Rechtlicher Hinweis: Anfüttern ist regional unterschiedlich geregelt — Gewässerordnung prüfen.

WEITERE KUNSTKÖDER:
- Wobbler: Tauchtiefe steht meist auf der Verpackung und hängt von der Schaufel ab. Führung: einleiern mit Stopps (Stop-and-Go) oder Twitchen (kurze Schläge mit der Rutenspitze bei halb lockerer Schnur, dazwischen Pausen — die Pause bringt den Biss).
- Spinner/Blinker: gleichmäßig so langsam einholen, dass das Blatt gerade noch dreht; in Flüssen schräg stromauf werfen und mit der Strömung führen. Nach dem Auswurf Absinkzeit zählen, um verschiedene Tiefen abzusuchen.
- Oberflächenköder (Popper/Stickbait): Popper mit kurzen Schlägen "blubbern" lassen, Stickbait im Zickzack führen (Walk the Dog: rhythmische kleine Schläge bei lockerer Schnur). Nach dem Biss erst anschlagen, wenn der Fisch wirklich Druck macht.

NATURKÖDER & FRIEDFISCH:
- Wurm/Made an Posen- oder Grundmontage: Haken 8–12 für Made, 4–8 für Tauwurm. Pose vorher exakt ausloten, Köder knapp über oder auf Grund anbieten.
- Köderfisch (tot) für Hecht/Zander/Aal/Wels: an Grund- oder Posenmontage mit Ryder- und Drillingshaken-System; für Zander kleine Köfis (6–10cm) und Einzelhaken, Anhieb früh setzen.
- Karpfen: Haarmontage — Boilie/Mais sitzt am "Haar" hinter dem blanken Haken, Selbsthakeffekt mit 60–100g Festblei. Vorher Spot anfüttern und Distanz mit Schnurclip festlegen.
- Forelle (Teich): Bienenmade oder Teig am Sbirolino oder an der Tremarella-Montage; Teig zum Propeller formen, sehr langsam mit zitternder Rutenspitze einholen.

MONTAGEN (Raubfisch-Finesse):
- Drop Shot: Haken 30–80cm über dem Endblei direkt an die Schnur (Palomar, Hakenspitze zeigt nach oben), Köder am Platz zupfen lassen ohne ihn einzuholen — stark für träge Barsche und Zander.
- Carolina/Texas: Durchlaufblei (Bullet) vor dem Vorfach bzw. direkt vor dem Offset-Haken; Offset-Haken macht den Köder krautfrei — durch Hindernisse und Kraut ziehen, wo Jigköpfe hängen bleiben.
- Cheburashka: austauschbares Klemmblei plus frei beweglicher Haken — der Köder spielt natürlicher als am starren Jigkopf.

KNOTEN (die vier wichtigsten):
- Verbesserter Clinch: Standard für Haken/Wirbel an Mono/Fluoro — 5–7 Windungen, durch die kleine und dann die große Schlaufe zurück, anfeuchten, zuziehen.
- Palomar: stärkster einfacher Knoten, ideal für Geflecht und Drop Shot — Doppelschnur durchs Öhr, Überhandknoten, Schlaufe über den Haken stülpen.
- Albright/FG: Verbindung Geflecht zu Fluorocarbon-Vorfach; FG hält am besten, Albright ist schneller gebunden.
- Schlaufenknoten (Rapala): gibt Wobblern und Jigs freies Spiel, wenn kein Snap verwendet wird.
- Immer gilt: Knoten vor dem Zuziehen anfeuchten, danach mit Zug testen.

DRILL, LANDUNG & HANDLING:
- Bremse vor dem ersten Wurf auf etwa ein Drittel der Schnurtragkraft einstellen (per Hand von der Rolle ziehen — sie soll unter Druck surrend Schnur freigeben).
- Drill: Rute im 45–90°-Winkel halten, nie auf den Fisch zeigen ("pumpen": Rute heben, beim Absenken kurbeln). Flucht laufen lassen, nicht gegenkurbeln.
- Landung: Fisch kopfvoran in den Kescher (gummierte Netze schonen die Schleimhaut), nasse Hände oder Abhakmatte, Hakenlöser/Zange bereit. Beim Zurücksetzen den Fisch im Wasser stützen, bis er selbst wegschwimmt.
- Waidgerechtes Töten (wo vorgeschrieben): Betäubung durch Schlag auf den Hinterkopf, danach Herzstich — regionale Regeln und Schonmaße immer beachten.

JAHRESZEIT & BEDINGUNGEN:
- Frühjahr: flache, sich schnell erwärmende Buchten; nach der Schonzeit sind Raubfische ufernah. Sommer: Morgen- und Abenddämmerung, tagsüber tiefere, kühlere Bereiche; Zander nachts flach. Herbst: beste Raubfischzeit, größere Köder, Fische fressen sich Winterspeck an. Winter: langsame Führung (Faulenzen, Vertikal), tiefe Löcher, Mittagszeit.
- Fallender Luftdruck vor einer Front macht Raubfische oft aktiv; bei Ostwind und Hochdruck eher Finesse-Methoden und kleinere Köder. Trübes Wasser: laute, grelle Köder (Firetiger, Rasseln); klares Wasser: natürliche Dekore und dünnere Vorfächer.`;
