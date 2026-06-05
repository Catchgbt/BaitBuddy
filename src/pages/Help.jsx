import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Help() {
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("frage");
  const [message, setMessage] = useState("");

  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadUser();
    loadTickets();
  }, []);

  const loadUser = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const data = await base44.entities.SupportTicket.list("-created_date", 50);
      setTickets(data);
    } catch (e) {
      console.error(e);
    }
    setLoadingTickets(false);
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Bitte Betreff und Nachricht ausfuellen");
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.SupportTicket.create({
        subject: subject.trim(),
        category,
        message: message.trim(),
        user_email: user?.email || "",
        user_name: user?.full_name || user?.nickname || "",
        status: "offen"
      });
      toast.success("Ticket erfolgreich erstellt");
      setSubject("");
      setMessage("");
      setCategory("frage");
      await loadTickets();
    } catch (e) {
      console.error(e);
      toast.error("Ticket konnte nicht erstellt werden");
    }
    setSubmitting(false);
  };

  const handleAiAsk = async () => {
    if (!aiQuestion.trim()) {
      toast.error("Bitte eine Frage eingeben");
      return;
    }
    setAiLoading(true);
    setAiAnswer("");
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist der Support-Assistent fuer die Angel-App "CatchGbt". Beantworte folgende Nutzerfrage hilfsbereit, kurz und auf Deutsch:\n\nFrage: ${aiQuestion}`
      });
      setAiAnswer(typeof res === "string" ? res : JSON.stringify(res));
    } catch (e) {
      console.error(e);
      toast.error("KI-Antwort fehlgeschlagen");
    }
    setAiLoading(false);
  };

  const statusColor = (s) => {
    switch (s) {
      case "offen": return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "in_bearbeitung": return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "geloest": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "geschlossen": return "bg-gray-500/20 text-gray-300 border-gray-500/40";
      default: return "bg-gray-500/20 text-gray-300 border-gray-500/40";
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-safe-fixed">
      <div className="max-w-4xl mx-auto p-6 space-y-6 pb-32">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]">
            Hilfe & Support
          </h1>
          <p className="text-gray-400 mt-1">Wir helfen dir gerne weiter</p>
        </div>

        <Tabs defaultValue="ticket" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-900/60 border border-gray-800">
            <TabsTrigger value="ticket">Ticket erstellen</TabsTrigger>
            <TabsTrigger value="meine">Meine Tickets</TabsTrigger>
            <TabsTrigger value="ki">KI-Hilfe</TabsTrigger>
            <TabsTrigger value="bewertungen">Bewertungen</TabsTrigger>
          </TabsList>

          <TabsContent value="ticket" className="mt-4">
            <Card className="glass-morphism border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Neues Support-Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Betreff</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Kurze Zusammenfassung"
                    className="bg-gray-800/50 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Kategorie</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">Bug / Fehler</SelectItem>
                      <SelectItem value="frage">Frage</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="abrechnung">Abrechnung</SelectItem>
                      <SelectItem value="sonstiges">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-gray-300 mb-1 block">Nachricht</label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Beschreibe dein Anliegen so genau wie moeglich"
                    className="bg-gray-800/50 border-gray-700 text-white min-h-[140px]"
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    "Ticket absenden"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meine" className="mt-4">
            <Card className="glass-morphism border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Meine Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTickets ? (
                  <div className="flex items-center justify-center py-8 text-cyan-400">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Lade Tickets...
                  </div>
                ) : tickets.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Noch keine Tickets vorhanden</p>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((t) => (
                      <div key={t.id} className="p-4 bg-gray-800/40 border border-gray-700 rounded-lg">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-white">{t.subject}</h3>
                          <Badge className={statusColor(t.status)}>{t.status}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          {new Date(t.created_date).toLocaleString("de-DE")} - {t.category}
                        </p>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{t.message}</p>
                        {t.admin_response && (
                          <div className="mt-3 p-3 bg-emerald-900/20 border border-emerald-700/40 rounded">
                            <p className="text-xs text-emerald-400 font-semibold mb-1">Antwort vom Support</p>
                            <p className="text-sm text-gray-200 whitespace-pre-wrap">{t.admin_response}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ki" className="mt-4">
            <Card className="glass-morphism border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">KI-Soforthilfe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Stelle deine Frage zur App..."
                  className="bg-gray-800/50 border-gray-700 text-white min-h-[100px]"
                />
                <Button
                  onClick={handleAiAsk}
                  disabled={aiLoading}
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Frage wird beantwortet...
                    </>
                  ) : (
                    "Frage stellen"
                  )}
                </Button>

                {aiAnswer && (
                  <div className="p-4 bg-cyan-900/20 border border-cyan-700/40 rounded-lg">
                    <p className="text-xs text-cyan-400 font-semibold mb-2">Antwort</p>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{aiAnswer}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bewertungen" className="mt-4">
            <Card className="glass-morphism border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Funktionsbewertungen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  Sieh dir an, wie andere Nutzer die Funktionen der App bewerten oder gib selbst eine Bewertung ab.
                </p>
                <Button
                  onClick={() => window.location.href = "/FunctionRatings"}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  Zu den Funktionsbewertungen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}