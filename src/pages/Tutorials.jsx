import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorPlay, Youtube, Info, Sparkles, Volume2 } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export default function Tutorials() {
  return (
    <div className="min-h-screen bg-gray-950 p-6 pb-32">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center gap-3 mb-6">
          <MonitorPlay className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
              CatchGbt Tutorials
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Lerne alles über CatchGbt mit interaktiven Anleitungen
            </p>
          </div>
        </div>

        <Carousel className="w-full max-w-xs mx-auto md:max-w-md lg:max-w-2xl">
          <CarouselContent>
            
            <CarouselItem>
              <Card className="glass-morphism border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 h-full flex flex-col justify-between min-h-[500px]">
                <CardHeader>
                  <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] flex items-center gap-2">
                    <Youtube className="w-6 h-6" />
                    Willkommen zu den Tutorials
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                  <p className="text-gray-300 text-base leading-relaxed">
                    Hier findest du interaktive Anleitungen, um das Beste aus deiner CatchGbt App herauszuholen.
                    Wische nach rechts, um fortzufahren und die wichtigsten Funktionen kennenzulernen.
                  </p>
                  <div className="text-center py-4">
                    <Sparkles className="w-12 h-12 text-purple-400 mx-auto animate-pulse" />
                  </div>
                </CardContent>
                <CardContent className="pt-0 text-center text-gray-500 text-sm">
                  <Info className="inline-block w-4 h-4 mr-1" />
                  Wische nach links oder rechts um zu navigieren
                </CardContent>
              </Card>
            </CarouselItem>
            
            <CarouselItem>
              <Card className="glass-morphism border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-green-500/10 h-full flex flex-col justify-between min-h-[500px]">
                <CardHeader>
                  <CardTitle className="text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)] flex items-center gap-2">
                    <Volume2 className="w-6 h-6" />
                    Vorlesefunktion
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 flex-grow">
                  <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4">
                    <h4 className="text-emerald-300 font-semibold mb-3 text-lg">Was ist die Vorlesefunktion?</h4>
                    <p className="text-gray-300 text-base leading-relaxed">
                      Die App kann dir Texte laut vorlesen. Dies funktioniert automatisch beim KI-Buddy, 
                      wenn du Sprachsteuerung aktiviert hast.
                    </p>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-emerald-300 font-semibold mb-3">So aktivierst du die Vorlesefunktion:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-gray-300 text-base">
                      <li>Öffne die Einstellungen</li>
                      <li>Gehe zu Voice-Einstellungen</li>
                      <li>Aktiviere Audio-Ausgabe</li>
                      <li>Wähle deine bevorzugte Stimme und Geschwindigkeit</li>
                    </ol>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-emerald-300 font-semibold mb-2">Wo funktioniert es?</h4>
                    <p className="text-gray-300 text-base">
                      Die Vorlesefunktion ist verfügbar im KI-Chat-Buddy. Wenn aktiviert, 
                      werden die Antworten des KI-Buddys automatisch vorgelesen.
                    </p>
                  </div>
                </CardContent>
                <CardContent className="pt-0 text-center text-gray-500 text-sm">
                  <Info className="inline-block w-4 h-4 mr-1" />
                  Wische nach links oder rechts um zu navigieren
                </CardContent>
              </Card>
            </CarouselItem>

            <CarouselItem>
              <Card className="glass-morphism border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 h-full flex flex-col justify-between min-h-[500px]">
                <CardHeader>
                  <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] flex items-center gap-2">
                    <MonitorPlay className="w-6 h-6" />
                    Umfassende Funktionen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="text-cyan-400 font-semibold mb-2">Umfassende Anleitungen</h4>
                      <p className="text-gray-400 text-sm">
                        Schritt-für-Schritt Tutorials für jede Funktion
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="text-cyan-400 font-semibold mb-2">Für jeden Level</h4>
                      <p className="text-gray-400 text-sm">
                        Von Anfänger bis Profi - für jeden etwas dabei
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="text-cyan-400 font-semibold mb-2">Schneller Einstieg</h4>
                      <p className="text-gray-400 text-sm">
                        Lerne die wichtigsten Features in wenigen Minuten
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="text-cyan-400 font-semibold mb-2">Tipps und Tricks</h4>
                      <p className="text-gray-400 text-sm">
                        Profitiere von Expertenwissen und Best Practices
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardContent className="pt-0 text-center text-gray-500 text-sm">
                  <Info className="inline-block w-4 h-4 mr-1" />
                  Wische nach links oder rechts um zu navigieren
                </CardContent>
              </Card>
            </CarouselItem>

            <CarouselItem>
              <Card className="glass-morphism border-gray-800 h-full flex flex-col justify-between min-h-[500px]">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <MonitorPlay className="w-6 h-6" />
                    Beliebte Tutorial-Themen
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-sm text-gray-300 bg-gray-800/30 rounded-lg p-3">Fänge loggen</div>
                    <div className="text-sm text-gray-300 bg-gray-800/30 rounded-lg p-3">KI-Buddy nutzen</div>
                    <div className="text-sm text-gray-300 bg-gray-800/30 rounded-lg p-3">Spots verwalten</div>
                    <div className="text-sm text-gray-300 bg-gray-800/30 rounded-lg p-3">Wetter-Alarme</div>
                    <div className="text-sm text-gray-300 bg-gray-800/30 rounded-lg p-3">Trip-Planer</div>
                    <div className="text-sm text-gray-300 bg-gray-800/30 rounded-lg p-3">Community Features</div>
                    <div className="text-sm text-gray-300 bg-gray-800/30 rounded-lg p-3">Premium-Features</div>
                    <div className="text-sm text-gray-300 bg-gray-800/30 rounded-lg p-3">Geräte verbinden</div>
                  </div>
                </CardContent>
                <CardContent className="pt-0 text-center text-gray-500 text-sm">
                  <Info className="inline-block w-4 h-4 mr-1" />
                  Wische nach links oder rechts um zu navigieren
                </CardContent>
              </Card>
            </CarouselItem>
            
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </div>
  );
}