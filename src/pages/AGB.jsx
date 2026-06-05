import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AGB() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
            Allgemeine Geschäftsbedingungen (AGB)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300 prose prose-invert max-w-none">
          
          <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">§ 1 Geltungsbereich</h2>
          <p>
            Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der Catchly-App und aller damit verbundenen Dienste, 
            die von Sebastian Schorn (nachfolgend "Anbieter") bereitgestellt werden.
          </p>
          <p>
            Mit der Registrierung und Nutzung der App erkennt der Nutzer diese AGB als verbindlich an.
          </p>

          <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">§ 2 Leistungsbeschreibung</h2>
          <p>
            Catchly ist eine digitale Anwendung für Angler, die folgende Funktionen bietet:
          </p>
          <ul>
            <li>Digitales Fangbuch zur Dokumentation von Fängen</li>
            <li>Verwaltung von Angelplätzen (Spots) mit Kartenintegration</li>
            <li>Wetterinformationen und Angelprognosen</li>
            <li>KI-basierte Fangberatung und Bildanalyse (Premium-Funktion)</li>
            <li>Community-Funktionen zum Austausch mit anderen Anglern</li>
            <li>Regelwerk und Schonzeiten-Informationen</li>
            <li>Geräte- und Ausrüstungsverwaltung</li>
          </ul>
          <p>
            Der Anbieter behält sich vor, den Funktionsumfang jederzeit zu erweitern, einzuschränken oder zu ändern.
          </p>

          <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">§ 3 Nutzerkonto und Registrierung</h2>
          <p>
            Die Nutzung der App erfordert die Erstellung eines Nutzerkontos. Der Nutzer verpflichtet sich:
          </p>
          <ul>
            <li>Wahrheitsgemäße Angaben bei der Registrierung zu machen</li>
            <li>Seine Zugangsdaten vertraulich zu behandeln</li>
            <li>Den Anbieter unverzüglich zu informieren, falls Dritte Kenntnis von den Zugangsdaten erlangt haben</li>
            <li>Die App nicht für rechtswidrige Zwecke zu nutzen</li>
          </ul>

          <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">§ 4 Premium-Funktionen und Credits</h2>
          <p>
            Bestimmte Funktionen der App (Premium-Funktionen) erfordern den Erwerb von Credits:
          </p>
          <ul>
            <li>Credits können in verschiedenen Paketen gekauft werden</li>
            <li>Die Preise werden vor dem Kauf transparent angezeigt</li>
            <li>Credits haben keine Verfallsdauer</li>
            <li>Der Verbrauch erfolgt minutenweise bei Nutzung von Premium-Funktionen</li>
            <li>Nicht genutzte Credits können nicht erstattet werden</li>
            <li>Credits sind nicht übertragbar</li>
          </ul>

          <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">§ 5 Widerrufsrecht</h2>
          <p>
            Bei digitalen Inhalten (Credits) erlischt das Widerrufsrecht gemäß § 356 Abs. 5 BGB, 
            wenn der Nutzer ausdrücklich zugestimmt hat, dass die Leistung vor Ablauf der Widerrufsfrist beginnt, 
            und er zur Kenntnis genommen hat, dass er durch seine Zustimmung mit Beginn der Vertragserfüllung sein Widerrufsrecht verliert.
          </p>

          <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">§ 6 Nutzerverhalten und Inhalte</h2>
          <p>
            Der Nutzer verpflichtet sich:
          </p>
          <ul>
            <li>Keine beleidigenden, diskriminierenden oder rechtswidrigen Inhalte zu veröffentlichen</li>
            <li>Die Rechte Dritter (Urheberrechte, Persönlichkeitsrechte) zu respektieren</li>
            <li>Keine Werbung oder Spam zu verbreiten</li>
            <li>Die Funktionalität der App nicht durch technische Manipulation zu beeinträchtigen</li>
          </ul>
          <p>
            Bei Verstößen behält sich der Anbieter vor, Inhalte zu löschen, den Account temporär zu sperren oder dauerhaft zu löschen.
          </p>

          <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">§ 7 Datenschutz</h2>
          <p>
            Die Verarbeitung personenbezogener Daten erfolgt gemäß der Datenschutzerklärung, die separat einsehbar ist. 
            Der Anbieter verpflichtet sich, die geltenden Datenschutzbestimmungen (DSGVO) einzuhalten.
          </p>

          <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">§ 8 Haftung</h2>
          <p>
            Der Anbieter haftet für Schäden nur bei Vorsatz und grober Fahrlässigkeit. 
            Die Haftung für leichte Fahrlässigkeit ist ausgeschlossen, außer bei Verletzung wesentlicher Vertragspflichten.
          </p>
          <p>
            Der Anbieter übernimmt keine Gewähr für:
          </p>
          <ul>
            <li>Die Richtigkeit und Vollständigkeit der bereitgestellten Informationen (Wetter, Regelwerk, KI-Analysen)</li>
            <li>Die ständige Verfügbarkeit der App</li>
            <li>Von Nutzern erstellte Inhalte</li>
          </ul>
          <p>
            Insbesondere Wetterinformationen und KI-basierte Empfehlungen dienen nur zur Information und ersetzen nicht die eigene Beurteilung und Verantwortung des Nutzers.
          </p>

          <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">§ 9 Verfügbarkeit und Wartung</h2>
          <p>
            Der Anbieter ist bemüht, eine möglichst hohe Verfügbarkeit der App zu gewährleisten. 
            Es besteht jedoch kein Anspruch auf permanente Verfügbarkeit. 
            Wartungsarbeiten können zu vorübergehenden Einschränkungen führen.
          </p>

          <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">§ 10 Änderungen der AGB</h2>
          <p>
            Der Anbieter behält sich vor, diese AGB jederzeit zu ändern. 
            Nutzer werden über wesentliche Änderungen per E-Mail oder In-App-Benachrichtigung informiert. 
            Widerspricht der Nutzer nicht innerhalb von 4 Wochen nach Bekanntgabe, gelten die geänderten AGB als akzeptiert.
          </p>

          <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">§ 11 Kündigung</h2>
          <p>
            Der Nutzer kann sein Konto jederzeit ohne Angabe von Gründen löschen. 
            Gekaufte Credits verfallen bei Löschung des Kontos ersatzlos.
          </p>
          <p>
            Der Anbieter kann das Nutzerkonto bei schwerwiegenden Verstößen gegen diese AGB fristlos kündigen.
          </p>

          <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">§ 12 Schlussbestimmungen</h2>
          <p>
            Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
          </p>
          <p>
            Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt.
          </p>

          <div className="mt-8 pt-4 border-t border-gray-700 text-sm text-gray-400">
            <p>
              <strong>Stand:</strong> Januar 2025<br />
              <strong>Anbieter:</strong> Sebastian Schorn<br />
              <strong>Kontakt:</strong> S.s.Bedburg@gmail.com
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}