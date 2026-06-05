import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, MapPin, ArrowLeft, Check, X, Trophy, Target, Clock, Sparkles, Wrench, BookOpen, AlertTriangle, Play, Fish } from "lucide-react";
import { motion } from "framer-motion";
import RodBuilderGame from "@/components/exam/RodBuilderGame";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import PremiumGuard from "@/components/premium/PremiumGuard";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

export default function AngelscheinPruefungSchonzeiten() {
  useFeatureTracking("angelschein_pruefung");
  const [selectedRegion, setSelectedRegion] = useState("Baden-Württemberg");
  const [examStarted, setExamStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [showGame, setShowGame] = useState(false);
  const [rules, setRules] = useState([]);
  const [user, setUser] = useState(null);
  const [revealedExplanations, setRevealedExplanations] = useState({});

  const bundeslaender = [
    "Baden-Württemberg",
    "Bayern",
    "Berlin",
    "Brandenburg",
    "Bremen",
    "Hamburg",
    "Hessen",
    "Mecklenburg-Vorpommern",
    "Niedersachsen",
    "Nordrhein-Westfalen",
    "Rheinland-Pfalz",
    "Saarland",
    "Sachsen",
    "Sachsen-Anhalt",
    "Schleswig-Holstein",
    "Thüringen"
  ];

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (examStarted && !showResults && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleFinishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [examStarted, showResults, timeLeft]);

  useEffect(() => {
    const loadRules = async () => {
      try {
        const allRules = await base44.entities.RuleEntry.list();
        const filteredRules = allRules.filter(r => 
          r.region === selectedRegion || r.region === "Deutschland"
        );
        setRules(filteredRules);
      } catch (error) {
        console.error("Fehler beim Laden der Regeln:", error);
      }
    };
    loadRules();
  }, [selectedRegion]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const allQuestions = await base44.entities.ExamQuestion.list();
      
      if (!allQuestions || allQuestions.length === 0) {
        toast.error("Keine Prüfungsfragen in der Datenbank vorhanden!");
        setLoading(false);
        return;
      }

      let regionQuestions = allQuestions.filter(q => 
        q.region === selectedRegion || q.region === "Deutschland"
      );

      if (regionQuestions.length === 0) {
        toast.warning(`Keine Fragen für ${selectedRegion} gefunden. Verwende deutschlandweite Fragen.`);
        regionQuestions = allQuestions.filter(q => q.region === "Deutschland");
      }

      const shuffled = regionQuestions.sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, Math.min(30, shuffled.length));

      if (selectedQuestions.length < 10) {
        toast.error("Nicht genügend Fragen für eine Prüfung vorhanden!");
        setLoading(false);
        return;
      }

      setQuestions(selectedQuestions);
      setUserAnswers(new Array(selectedQuestions.length).fill(null));
      setExamStarted(true);
      setCurrentQuestion(0);
      setTimeLeft(3600);
      setShowResults(false);

      toast.success(`Prüfung gestartet mit ${selectedQuestions.length} Fragen!`);
    } catch (error) {
      console.error("Fehler beim Laden der Fragen:", error);
      toast.error("Fehler beim Laden der Prüfungsfragen!");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answerIndex) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setUserAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleFinishExam = () => {
    setShowResults(true);

    // Fragen, bei denen die Erklärung vor der Antwort aufgedeckt wurde, zählen nicht
    const scorableIndices = questions
      .map((_, i) => i)
      .filter(i => !revealedExplanations[i]);

    const correctAnswers = scorableIndices.filter(i =>
      userAnswers[i] === questions[i]?.correct_answer_index
    ).length;

    const totalScorable = scorableIndices.length || 1;
    const percentage = (correctAnswers / totalScorable) * 100;
    const passed = percentage >= 60;

    if (passed) {
      toast.success(`Bestanden! ${correctAnswers} von ${totalScorable} richtig (${percentage.toFixed(1)}%)`);
    } else {
      toast.error(`Nicht bestanden. ${correctAnswers} von ${totalScorable} richtig (${percentage.toFixed(1)}%)`);
    }
  };

  const handleRevealExplanation = () => {
    if (revealedExplanations[currentQuestion]) return;
    const ok = window.confirm(
      "Wenn du dir die Erklärung jetzt anzeigen lässt, wird diese Frage nicht gewertet (kein Punkt). Fortfahren?"
    );
    if (!ok) return;
    setRevealedExplanations(prev => ({ ...prev, [currentQuestion]: true }));
  };

  const resetExam = () => {
    setExamStarted(false);
    setCurrentQuestion(0);
    setQuestions([]);
    setUserAnswers([]);
    setShowResults(false);
    setTimeLeft(3600);
    setRevealedExplanations({});
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isCurrentlyClosedSeason = (closedFrom, closedTo) => {
    if (!closedFrom || !closedTo) return false;
    const today = new Date();
    const currentYear = today.getFullYear();

    const [fromMonth, fromDay] = closedFrom.split('-').slice(1).map(Number);
    const [toMonth, toDay] = closedTo.split('-').slice(1).map(Number);

    let fromDate = new Date(currentYear, fromMonth - 1, fromDay);
    let toDate = new Date(currentYear, toMonth - 1, toDay);

    if (fromDate > toDate) {
        if (today < fromDate && today < toDate) {
            fromDate = new Date(currentYear - 1, fromMonth - 1, fromDay);
        } else if (today > fromDate && today > toDate) {
            toDate = new Date(currentYear + 1, toMonth - 1, toDay);
        }
    }
    return today >= fromDate && today <= toDate;
  };

  return (
    <PremiumGuard 
      user={user} 
      requiredPlan="pro"
      feature="Die Angelschein-Prüfung & Schonzeiten ist ein Pro-Feature"
    >
      {showGame && (
        <div className="container mx-auto px-4 py-8">
          <Button
            onClick={() => setShowGame(false)}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zur Prüfung
          </Button>
          <RodBuilderGame />
        </div>
      )}

      {loading && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-gray-300">Lade Prüfungsfragen...</p>
          </div>
        </div>
      )}

      {!examStarted && !loading && !showGame && (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-8">
              <GraduationCap className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-emerald-400 text-transparent bg-clip-text">
                Angelschein-Prüfung & Schonzeiten
              </h1>
              <p className="text-gray-400">
                Bereite dich optimal auf die Fischerprüfung vor und kenne deine Regeln
              </p>
            </div>

            <Card className="glass-morphism border-gray-800 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cyan-400">
                  <MapPin className="w-5 h-5" />
                  Bundesland wählen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500"
                >
                  {bundeslaender.map(land => (
                    <option key={land} value={land}>{land}</option>
                  ))}
                </select>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card className="glass-morphism border-gray-800">
                <CardContent className="pt-6">
                  <Target className="w-12 h-12 text-emerald-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-white">Prüfungssimulation</h3>
                  <p className="text-gray-400 mb-4">
                    Realistische Prüfung mit 30 Fragen aus allen Kategorien
                  </p>
                  <ul className="space-y-2 text-sm text-gray-300 mb-4">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      60 Minuten Zeitlimit
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      Verschiedene Schwierigkeitsgrade
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      Detaillierte Auswertung
                    </li>
                  </ul>
                  <Button
                    onClick={loadQuestions}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Prüfung starten
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass-morphism border-gray-800">
                <CardContent className="pt-6">
                  <Wrench className="w-12 h-12 text-purple-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-white">Ruten-Bau-Spiel</h3>
                  <p className="text-gray-400 mb-4">
                    Lerne spielerisch den Aufbau einer Angelrute
                  </p>
                  <ul className="space-y-2 text-sm text-gray-300 mb-4">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-purple-400" />
                      Interaktives Lernen
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-purple-400" />
                      Praktisches Wissen
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-purple-400" />
                      Spaß beim Lernen
                    </li>
                  </ul>
                  <Button
                    onClick={() => setShowGame(true)}
                    variant="outline"
                    className="w-full border-purple-500 text-purple-400 hover:bg-purple-500/10"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Spiel starten
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-morphism border-gray-800 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-400">
                  <BookOpen className="w-5 h-5" />
                  Prüfungstipps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-300">
                <p>Lies jede Frage sorgfältig durch, bevor du antwortest</p>
                <p>Du kannst zwischen den Fragen vor und zurück navigieren</p>
                <p>Achte auf die verbleibende Zeit im oberen Bereich</p>
                <p>Zum Bestehen benötigst du mindestens 60% richtige Antworten</p>
                <p>Nach der Prüfung erhältst du eine detaillierte Auswertung</p>
              </CardContent>
            </Card>

            <Card className="glass-morphism border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-400">
                  <Fish className="w-5 h-5" />
                  Angelregeln & Schonzeiten ({selectedRegion})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {rules.length > 0 ? (
                  rules.map((rule, index) => (
                    <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                      <h4 className="text-white font-semibold text-lg mb-1">{rule.fish}</h4>
                      <p className="text-gray-300 text-sm mb-1">
                        Region: <span className="font-medium text-cyan-400">{rule.region}</span>
                      </p>
                      {rule.min_size_cm && (
                        <p className="text-gray-300 text-sm">Mindestmaß: {rule.min_size_cm} cm</p>
                      )}
                      {rule.closed_from && rule.closed_to && (
                        <p className="text-gray-300 text-sm">
                          Schonzeit: {rule.closed_from} bis {rule.closed_to}
                          {isCurrentlyClosedSeason(rule.closed_from, rule.closed_to) && (
                            <span className="ml-2 px-2 py-0.5 bg-red-900/50 text-red-400 text-xs rounded-full">
                              Aktuell Schonzeit
                            </span>
                          )}
                        </p>
                      )}
                      {rule.hook_limit && (
                        <p className="text-gray-300 text-sm">Hakenlimit: {rule.hook_limit}</p>
                      )}
                      {rule.notes && (
                        <p className="text-gray-400 text-xs mt-2">{rule.notes}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">Keine spezifischen Regeln für {selectedRegion} gefunden.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {showResults && !loading && !showGame && (() => {
        const correctAnswers = userAnswers.filter((answer, index) => 
          answer === questions[index]?.correct_answer_index
        ).length;
        const percentage = (correctAnswers / questions.length) * 100;
        const passed = percentage >= 60;

        return (
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className={`glass-morphism border-2 mb-6 ${passed ? 'border-emerald-500' : 'border-red-500'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    {passed ? (
                      <>
                        <Trophy className="w-8 h-8 text-emerald-400" />
                        <span className="text-emerald-400">Herzlichen Glückwunsch</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                        <span className="text-red-400">Leider nicht bestanden</span>
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="text-6xl font-bold mb-2" style={{ color: passed ? '#10b981' : '#ef4444' }}>
                      {percentage.toFixed(1)}%
                    </div>
                    <p className="text-gray-300 text-lg">
                      {correctAnswers} von {questions.length} Fragen richtig beantwortet
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Allgemein", key: "allgemein" },
                      { label: "Gerätekunde", key: "geraetekunde" },
                      { label: "Gewässerkunde", key: "gewaesserkunde" },
                      { label: "Gesetzeskunde", key: "gesetzeskunde" }
                    ].map(category => {
                      const categoryQuestions = questions.filter(q => q.category === category.key);
                      const categoryCorrect = categoryQuestions.filter((q, i) => {
                        const questionIndex = questions.indexOf(q);
                        return userAnswers[questionIndex] === q.correct_answer_index;
                      }).length;
                      const categoryPercentage = categoryQuestions.length > 0 
                        ? (categoryCorrect / categoryQuestions.length) * 100 
                        : 0;

                      return (
                        <div key={category.key} className="text-center p-4 bg-gray-800/50 rounded-lg">
                          <div className="text-2xl font-bold text-cyan-400 mb-1">
                            {categoryPercentage.toFixed(0)}%
                          </div>
                          <div className="text-sm text-gray-400">{category.label}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {categoryCorrect}/{categoryQuestions.length}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-cyan-400 mb-4">Fragenübersicht</h3>
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                      {questions.map((question, index) => {
                        const isCorrect = userAnswers[index] === question.correct_answer_index;
                        const wasAnswered = userAnswers[index] !== null;
                        
                        return (
                          <button
                            key={index}
                            onClick={() => {
                              setCurrentQuestion(index);
                              setShowResults(false);
                              setExamStarted(true);
                            }}
                            className={`
                              aspect-square rounded-lg flex items-center justify-center font-semibold text-sm
                              transition-all hover:scale-110
                              ${isCorrect ? 'bg-emerald-600 text-white' : ''}
                              ${!isCorrect && wasAnswered ? 'bg-red-600 text-white' : ''}
                              ${!wasAnswered ? 'bg-gray-700 text-gray-400' : ''}
                            `}
                          >
                            {index + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={resetExam}
                      variant="outline"
                      className="flex-1"
                    >
                      Neue Prüfung
                    </Button>
                    <Button
                      onClick={() => {
                        setShowResults(false);
                        setCurrentQuestion(0);
                      }}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                    >
                      Antworten überprüfen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        );
      })()}

      {!showGame && examStarted && !showResults && questions.length === 0 && (
        <div className="container mx-auto px-4 py-8 text-center">
          <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Keine Fragen verfügbar</h2>
          <p className="text-gray-400 mb-6">
            Es konnten keine Prüfungsfragen geladen werden. Bitte versuche es später erneut.
          </p>
          <Button onClick={resetExam} className="bg-cyan-600 hover:bg-cyan-700">
            Zurück zur Startseite
          </Button>
        </div>
      )}

      {!showGame && examStarted && !showResults && questions.length > 0 && (() => {
        const question = questions[currentQuestion];
        const progress = ((currentQuestion + 1) / questions.length) * 100;

        return (
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-gray-300">
                  <Target className="w-5 h-5 text-cyan-400" />
                  <span className="font-semibold">
                    Frage {currentQuestion + 1} von {questions.length}
                  </span>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  timeLeft < 300 ? 'bg-red-900/30 border border-red-700' : 'bg-gray-800/50'
                }`}>
                  <Clock className={`w-5 h-5 ${timeLeft < 300 ? 'text-red-400' : 'text-cyan-400'}`} />
                  <span className={`font-mono font-semibold ${timeLeft < 300 ? 'text-red-400' : 'text-white'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              <Progress value={progress} className="mb-6 h-2" />

              <Card className="glass-morphism border-gray-800 mb-6">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-900/50 text-cyan-400">
                          {question.category}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          question.difficulty === 'leicht' ? 'bg-emerald-900/50 text-emerald-400' :
                          question.difficulty === 'mittel' ? 'bg-amber-900/50 text-amber-400' :
                          'bg-red-900/50 text-red-400'
                        }`}>
                          {question.difficulty}
                        </span>
                      </div>
                      <CardTitle className="text-xl text-white leading-relaxed">
                        {question.question}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {question.answers.map((answer, index) => {
                    const isSelected = userAnswers[currentQuestion] === index;
                    const isCorrect = question.correct_answer_index === index;
                    const showCorrect = showResults || userAnswers[currentQuestion] !== null;

                    return (
                      <button
                        key={index}
                        onClick={() => !showResults && handleAnswer(index)}
                        disabled={showResults}
                        className={`
                          w-full p-4 rounded-lg text-left transition-all border-2
                          ${isSelected && !showResults ? 'border-cyan-500 bg-cyan-900/30' : 'border-gray-700'}
                          ${showResults && isCorrect ? 'border-emerald-500 bg-emerald-900/30' : ''}
                          ${showResults && isSelected && !isCorrect ? 'border-red-500 bg-red-900/30' : ''}
                          ${!showResults && !isSelected ? 'hover:border-gray-600 hover:bg-gray-800/50' : ''}
                          disabled:cursor-not-allowed
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                            ${isSelected && !showResults ? 'border-cyan-500 bg-cyan-500' : 'border-gray-600'}
                            ${showResults && isCorrect ? 'border-emerald-500 bg-emerald-500' : ''}
                            ${showResults && isSelected && !isCorrect ? 'border-red-500 bg-red-500' : ''}
                          `}>
                            {showResults && isCorrect && <Check className="w-4 h-4 text-white" />}
                            {showResults && isSelected && !isCorrect && <X className="w-4 h-4 text-white" />}
                            {isSelected && !showResults && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="text-white">{answer}</span>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {question.explanation && (
                revealedExplanations[currentQuestion] ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="glass-morphism border-gray-800 mb-6">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <BookOpen className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold text-cyan-400 mb-2">Erklärung</h4>
                            <p className="text-gray-300 leading-relaxed">{question.explanation}</p>
                            <p className="text-xs text-amber-400 mt-3">
                              Diese Frage wird nicht gewertet.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <Card className="glass-morphism border-gray-800 mb-6">
                    <CardContent className="pt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                      <div className="flex items-start gap-3">
                        <BookOpen className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                        <p className="text-gray-300 text-sm leading-relaxed">
                          Du kannst dir die Erklärung anzeigen lassen. Diese Frage wird dann nicht gewertet.
                        </p>
                      </div>
                      <Button
                        onClick={handleRevealExplanation}
                        variant="outline"
                        className="border-amber-500 text-amber-400 hover:bg-amber-500/10 whitespace-nowrap"
                      >
                        Erklärung anzeigen
                      </Button>
                    </CardContent>
                  </Card>
                )
              )}

              <div className="flex justify-between gap-3">
                <Button
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zurück
                </Button>
                
                {currentQuestion < questions.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                  >
                    Weiter
                    <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleFinishExam}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Prüfung abschließen
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        );
      })()}
    </PremiumGuard>
  );
}