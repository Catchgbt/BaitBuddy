import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Clock, Check, X, RotateCcw } from 'lucide-react';

const FISHING_QUESTIONS = [
  {
    question: "Welcher Fisch ist als 'Barbe' bekannt?",
    answers: ["Flussbarbe", "Barsch", "Döbel", "Aitel"],
    correct: 0
  },
  {
    question: "Was bedeutet 'C&R' beim Angeln?",
    answers: ["Cast & Reel", "Catch & Release", "Carp & Roach", "Calm & Relaxed"],
    correct: 1
  },
  {
    question: "Welche Schnurstärke wird in der Regel zum Hechtangeln verwendet?",
    answers: ["0,10-0,15 mm", "0,20-0,25 mm", "0,30-0,40 mm", "0,50-0,60 mm"],
    correct: 2
  },
  {
    question: "Was ist ein 'Boilie'?",
    answers: ["Eine Angelrute", "Ein Karpfenköder", "Ein Knoten", "Eine Angeltechnik"],
    correct: 1
  },
  {
    question: "Welcher Fisch hat keine Schuppen?",
    answers: ["Karpfen", "Forelle", "Aal", "Barsch"],
    correct: 2
  },
  {
    question: "Was ist die optimale Wassertemperatur für Karpfen?",
    answers: ["5-10°C", "10-15°C", "15-25°C", "25-30°C"],
    correct: 2
  },
  {
    question: "Welche Hakengröße ist am kleinsten?",
    answers: ["Größe 2", "Größe 6", "Größe 10", "Größe 14"],
    correct: 3
  },
  {
    question: "Was ist ein 'Wobbler'?",
    answers: ["Ein Kunstköder", "Ein Wirbel", "Eine Pose", "Ein Kescher"],
    correct: 0
  },
  {
    question: "Welcher Fisch ist ein reiner Raubfisch?",
    answers: ["Brassen", "Rotauge", "Zander", "Schleie"],
    correct: 2
  },
  {
    question: "Was bedeutet 'Schonzeit'?",
    answers: ["Beste Angelzeit", "Verbotene Fangzeit", "Ruhephase", "Fütterungszeit"],
    correct: 1
  },
  {
    question: "Welche Farbe hat die Leber eines gesunden Fisches?",
    answers: ["Grau", "Dunkelrot", "Gelb", "Grün"],
    correct: 1
  },
  {
    question: "Was ist ein 'Spinner'?",
    answers: ["Ein Angelplatz", "Ein Köder mit rotierendem Blatt", "Eine Angelrolle", "Ein Fischname"],
    correct: 1
  },
  {
    question: "Wie viele Flossen hat ein Hecht?",
    answers: ["5", "6", "7", "8"],
    correct: 2
  },
  {
    question: "Was ist das Mindestmaß?",
    answers: ["Tiefe des Gewässers", "Minimale Fischlänge zum Entnehmen", "Abstand zum Ufer", "Angelerlaubnis-Kosten"],
    correct: 1
  },
  {
    question: "Welcher Köder ist für Forellen ideal?",
    answers: ["Mais", "Bienenmade", "Boilie", "Tauwurm"],
    correct: 1
  },
  {
    question: "Was ist eine 'Feedermontage'?",
    answers: ["Raubfischangeln", "Grundangeln mit Futterkorb", "Spinnfischen", "Fliegenfischen"],
    correct: 1
  },
  {
    question: "Welcher Fisch lebt in Schwärmen?",
    answers: ["Hecht", "Wels", "Rotauge", "Zander"],
    correct: 2
  },
  {
    question: "Was ist der 'Haken-Anhieb'?",
    answers: ["Wurftechnik", "Ruckartige Bewegung zum Haksetzen", "Ködermontage", "Fischart"],
    correct: 1
  },
  {
    question: "Welche Schnur ist am abriebfestesten?",
    answers: ["Monofile", "Geflochtene", "Fluorocarbon", "Stahlvorfach"],
    correct: 2
  },
  {
    question: "Was fressen Karpfen hauptsächlich?",
    answers: ["Kleine Fische", "Insekten und Würmer", "Algen", "Wasserpflanzen"],
    correct: 1
  }
];

export default function FishingQuiz() {
  const [gameState, setGameState] = useState('start'); // start, playing, finished
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (gameState === 'start') {
      // Mische Fragen und nimm 10 zufällige
      const shuffled = [...FISHING_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
      setQuestions(shuffled);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing' && !showResult && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResult) {
      handleTimeout();
    }
  }, [timeLeft, gameState, showResult]);

  const startGame = () => {
    setGameState('playing');
    setCurrentQuestion(0);
    setScore(0);
    setTimeLeft(10);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleTimeout = () => {
    setShowResult(true);
    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  const handleAnswer = (index) => {
    if (showResult) return;
    
    setSelectedAnswer(index);
    setShowResult(true);
    
    const isCorrect = index === questions[currentQuestion].correct;
    if (isCorrect) {
      setScore(score + 1);
    }
    
    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  const nextQuestion = () => {
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setTimeLeft(10);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setGameState('finished');
    }
  };

  const getScoreEmoji = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 90) return "🏆";
    if (percentage >= 70) return "🥇";
    if (percentage >= 50) return "🥈";
    if (percentage >= 30) return "🥉";
    return "🎣";
  };

  const getScoreMessage = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 90) return "Meister-Angler!";
    if (percentage >= 70) return "Sehr gut!";
    if (percentage >= 50) return "Gut gemacht!";
    if (percentage >= 30) return "Nicht schlecht!";
    return "Weiter üben!";
  };

  if (gameState === 'start') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6"
        >
          <div className="text-7xl mb-4">🧠</div>
          <h1 className="text-5xl font-bold text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]">
            Angel-Quiz
          </h1>
          <p className="text-xl text-gray-300 max-w-md mx-auto">
            Teste dein Wissen über Angeln, Fische und Ausrüstung!
          </p>
          <div className="space-y-3 text-gray-400">
            <p className="flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              10 Sekunden pro Frage
            </p>
            <p>10 zufällige Fragen</p>
            <p>Punkte für richtige Antworten</p>
          </div>
          <Button
            onClick={startGame}
            className="mt-8 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-700 hover:to-emerald-700 text-white px-8 py-6 text-xl"
          >
            Quiz starten
          </Button>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="text-8xl mb-4">{getScoreEmoji()}</div>
          <h2 className="text-4xl font-bold text-cyan-400">
            {getScoreMessage()}
          </h2>
          <div className="bg-gray-800/50 rounded-2xl p-8 backdrop-blur-sm border border-gray-700">
            <p className="text-6xl font-bold text-white mb-2">
              {score}/{questions.length}
            </p>
            <p className="text-gray-400">Richtige Antworten</p>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-3xl font-bold text-emerald-400">
                {Math.round((score / questions.length) * 100)}%
              </p>
            </div>
          </div>
          <Button
            onClick={startGame}
            className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-700 hover:to-emerald-700 text-white px-6 py-4 text-lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Nochmal spielen
          </Button>
        </motion.div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black p-6">
      <div className="w-full max-w-3xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gray-800/50 rounded-xl px-4 py-2 backdrop-blur-sm border border-gray-700">
              <span className="text-gray-400 text-sm">Frage</span>
              <span className="text-white font-bold text-lg ml-2">
                {currentQuestion + 1}/{questions.length}
              </span>
            </div>
            <div className="bg-gray-800/50 rounded-xl px-4 py-2 backdrop-blur-sm border border-gray-700">
              <Trophy className="w-4 h-4 text-amber-400 inline mr-2" />
              <span className="text-white font-bold">{score}</span>
            </div>
          </div>
          
          {/* Timer */}
          <motion.div
            className={`bg-gray-800/50 rounded-xl px-6 py-3 backdrop-blur-sm border ${
              timeLeft <= 3 ? 'border-red-500 animate-pulse' : 'border-gray-700'
            }`}
            animate={timeLeft <= 3 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: timeLeft <= 3 ? Infinity : 0 }}
          >
            <Clock className={`w-5 h-5 inline mr-2 ${timeLeft <= 3 ? 'text-red-400' : 'text-cyan-400'}`} />
            <span className={`font-bold text-2xl ${timeLeft <= 3 ? 'text-red-400' : 'text-white'}`}>
              {timeLeft}s
            </span>
          </motion.div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="glass-morphism border-gray-700 bg-gray-800/50">
              <CardContent className="pt-8 pb-6">
                <h3 className="text-2xl font-bold text-white mb-8 leading-relaxed">
                  {question.question}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {question.answers.map((answer, index) => {
                    const isCorrect = index === question.correct;
                    const isSelected = selectedAnswer === index;
                    const showCorrect = showResult && isCorrect;
                    const showWrong = showResult && isSelected && !isCorrect;
                    
                    return (
                      <motion.button
                        key={index}
                        onClick={() => handleAnswer(index)}
                        disabled={showResult}
                        whileHover={!showResult ? { scale: 1.02 } : {}}
                        whileTap={!showResult ? { scale: 0.98 } : {}}
                        className={`
                          p-6 rounded-xl text-left transition-all border-2
                          ${showCorrect ? 'bg-emerald-500/20 border-emerald-500' : ''}
                          ${showWrong ? 'bg-red-500/20 border-red-500' : ''}
                          ${!showResult ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-600/50 hover:border-cyan-500' : ''}
                          ${showResult && !isCorrect && !isSelected ? 'opacity-50' : ''}
                          disabled:cursor-not-allowed
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium pr-4">{answer}</span>
                          {showCorrect && <Check className="w-6 h-6 text-emerald-400 flex-shrink-0" />}
                          {showWrong && <X className="w-6 h-6 text-red-400 flex-shrink-0" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}