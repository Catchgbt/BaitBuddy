
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User } from '@/entities/User';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { BrainCircuit, Check, X, Award, Clock, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Removed global QUIZ_LEVELS and question definitions as they are now embedded within QuizPage component

const QUESTION_TIME = 20; // Time in seconds for each question

// Helper to shuffle arrays
const shuffleArray = (array) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

export default function QuizPage() {
  const [gameState, setGameState] = useState('level-selection');
  const [currentLevelData, setCurrentLevelData] = useState(null); // Stores the selected level's config
  const [currentQuestions, setCurrentQuestions] = useState([]); // Questions for the current quiz run
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null); // Index of the option chosen by the user
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0); // Count of correct answers
  const [wrongCount, setWrongCount] = useState(0); // Count of wrong answers
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [runStartTime, setRunStartTime] = useState(null);
  const [answered, setAnswered] = useState(false); // New state: true if user has answered the current question

  // useRef for the timer to manage intervals reliably
  const timerRef = useRef(null);

  // New QUIZ_LEVELS structure as per outline, with embedded and converted questions
  const quizLevelsConfig = useMemo(() => {
    // Original combined questions for conversion
    const ORIGINAL_INLINE_QUESTIONS_DE_SOURCE = [
      { "id": "de001", "level": "leicht", "category": "Fischarten", "question": "Welcher dieser Fische ist ein Raubfisch?", "answers": [{ "id": 1, "text": "Hecht", "isCorrect": true }, { "id": 2, "text": "Karpfen", "isCorrect": false }, { "id": 3, "text": "Brachse", "isCorrect": false }, { "id": 4, "text": "Rotauge", "isCorrect": false }] },
      { "id": "de002", "level": "mittel", "category": "Ausrüstung", "question": "Was bedeutet 'Wurfgewicht' bei einer Angelrute?", "answers": [{ "id": 1, "text": "Das optimale Gewicht des Köders", "isCorrect": true }, { "id": 2, "text": "Das Gewicht der Rute", "isCorrect": false }, { "id": 3, "text": "Das maximale Gewicht des Fisches", "isCorrect": false }, { "id": 4, "text": "Das Gewicht der Rolle", "isCorrect": false }] },
      { "id": "de003", "level": "profi", "category": "Technik", "question": "Was ist das 'Drop-Shot-Rig'?", "answers": [{ "id": 1, "text": "Eine Finesse-Montage, bei der der Köder über dem Blei schwebt", "isCorrect": true }, { "id": 2, "text": "Eine Montage zum Grundangeln auf Karpfen", "isCorrect": false }, { "id": 3, "text": "Eine spezielle Art des Fliegenfischens", "isCorrect": false }, { "id": 4, "text": "Eine Methode zum Schleppfischen", "isCorrect": false }] },
      { "id": "de004", "level": "ass", "category": "Biologie", "question": "Welches Sinnesorgan ist beim Zander besonders ausgeprägt und für die Jagd in trübem Wasser entscheidend?", "answers": [{ "id": 1, "text": "Das Seitenlinienorgan", "isCorrect": true }, { "id": 2, "text": "Der Geruchssinn", "isCorrect": false }, { "id": 3, "text": "Das Gehör", "isCorrect": false }, { "id": 4, "text": "Die Augen (Restlichtverstärker)", "isCorrect": false }] }
    ];

    const NEW_INLINE_QUESTIONS_DE_SOURCE = [
      { question: "Welcher Knoten ist ideal, um eine Hauptschnur mit einem Vorfach zu verbinden?", answers: ["Albright-Knoten", "Grinner-Knoten", "Palomar-Knoten", "Blutknoten"], correct: "Albright-Knoten", category: "Knoten" },
      { question: "Was ist das Mindestmaß für Hecht in den meisten deutschen Bundesländern?", answers: ["50cm", "60cm", "45cm", "70cm"], correct: "50cm", category: "Regeln" },
      { question: "Welche Funktion hat ein Bissanzeiger?", answers: ["Fisch anlocken", "Biss signalisieren", "Schnur entwirren", "Köder auswerfen"], correct: "Biss signalisieren", category: "Ausrüstung" },
      { question: "Was bedeutet 'C&R'?", answers: ["Catch & Release", "Come & Relax", "Cast & Retrieve", "Carp & Roach"], correct: "Catch & Release", category: "Technik" },
      { question: "Welcher Fisch wird oft als 'König der Flüsse' bezeichnet?", answers: ["Lachs", "Huchen", "Barbe", "Forelle"], correct: "Huchen", category: "Fischkunde" },
      { question: "Was ist eine 'Pose'?", answers: ["Ein künstlicher Köder", "Ein Schwimmer", "Eine spezielle Angelrute", "Ein Gewicht"], correct: "Ein Schwimmer", category: "Ausrüstung" },
      { question: "Welche Jahreszeit gilt als beste für das Hechtangeln?", answers: ["Frühling & Herbst", "Nur Sommer", "Nur Winter", "Ganzjährig gleich"], correct: "Frühling & Herbst", category: "Saisonal" },
    ];

    const allConvertedQuestions = [];

    // Convert ORIGINAL_INLINE_QUESTIONS_DE_SOURCE to new format
    ORIGINAL_INLINE_QUESTIONS_DE_SOURCE.forEach(q => {
      const options = q.answers.map(a => a.text);
      const originalCorrectText = q.answers.find(a => a.isCorrect)?.text;
      const shuffledOptions = shuffleArray([...options]);
      const correctIndex = originalCorrectText ? shuffledOptions.indexOf(originalCorrectText) : -1;

      allConvertedQuestions.push({
        id: q.id,
        level: q.level, // Keep original level for initial categorization
        category: q.category,
        question: q.question,
        options: shuffledOptions,
        correct: correctIndex
      });
    });

    // Convert NEW_INLINE_QUESTIONS_DE_SOURCE to new format
    let currentQuestionIdCounter = 100;
    NEW_INLINE_QUESTIONS_DE_SOURCE.forEach(q => {
      const options = q.answers;
      const originalCorrectText = q.correct;
      const shuffledOptions = shuffleArray([...options]);
      const correctIndex = originalCorrectText ? shuffledOptions.indexOf(originalCorrectText) : -1;

      allConvertedQuestions.push({
        id: `de${currentQuestionIdCounter++}`,
        level: 'dynamic', // Placeholder for new questions to be distributed
        category: q.category,
        question: q.question,
        options: shuffledOptions,
        correct: correctIndex
      });
    });

    // Categorize questions into new levels
    const einsteigerPool = allConvertedQuestions.filter(q => q.level === 'leicht');
    const fortgeschrittenPool = allConvertedQuestions.filter(q => q.level === 'mittel');
    const profiPool = allConvertedQuestions.filter(q => q.level === 'profi' || q.level === 'ass');
    const dynamicPool = allConvertedQuestions.filter(q => q.level === 'dynamic');

    // Distribute dynamic questions evenly, prioritizing levels with fewer questions
    dynamicPool.forEach(q => {
      if (einsteigerPool.length <= fortgeschrittenPool.length && einsteigerPool.length <= profiPool.length) {
          einsteigerPool.push(q);
      } else if (fortgeschrittenPool.length <= profiPool.length) {
          fortgeschrittenPool.push(q);
      } else {
          profiPool.push(q);
      }
    });
    
    // Shuffle questions within each pool once for a random base order
    const getLevelQuestions = (pool) => shuffleArray([...pool]);

    return [
      {
        name: "Einsteiger",
        key: "einsteiger", // Internal key for level identification
        description: "Grundlagen des Angelns",
        pointsPerCorrectAnswer: 100, // Fixed 100 points as per outline
        color: 'bg-green-500', // Re-introducing colors for UI
        questions: getLevelQuestions(einsteigerPool)
      },
      {
        name: "Fortgeschritten",
        key: "fortgeschritten",
        description: "Erweiterte Angeltechniken",
        pointsPerCorrectAnswer: 100,
        color: 'bg-yellow-500',
        questions: getLevelQuestions(fortgeschrittenPool)
      },
      {
        name: "Profi",
        key: "profi",
        description: "Expertenwissen für erfahrene Angler",
        pointsPerCorrectAnswer: 100,
        color: 'bg-red-500',
        questions: getLevelQuestions(profiPool)
      }
    ];
  }, []);

  // Effect for loading user data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const userData = await User.me();
        setUser(userData);
      } catch (error) {
        console.error("Fehler beim Laden der Benutzerdaten:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Callback to handle quiz end and save results
  const handleQuizEnd = useCallback(async () => {
    const durationSec = Math.round((Date.now() - runStartTime) / 1000);
    const newRun = {
      date: new Date().toISOString(),
      level: currentLevelData.key,
      correct: correctCount,
      wrong: wrongCount,
      durationSec,
      score: score,
    };

    try {
        if (user) {
          const updatedUserData = {
              quiz_points: (user.quiz_points || 0) + score,
              quiz_runs: [...(user.quiz_runs || []), newRun]
          };
          await User.updateMyUserData(updatedUserData);
          setUser(prev => ({...prev, ...updatedUserData}));
        } else {
            console.warn("User data not available, cannot save quiz progress.");
        }
    } catch (error) {
        console.error("Fehler beim Speichern des Quiz-Fortschritts:", error);
    }
    setGameState('results');
  }, [correctCount, wrongCount, currentLevelData, runStartTime, score, user]);

  // Function to start a new quiz
  const startQuiz = (levelConfig) => {
    // Shuffle the questions for the chosen level for this specific quiz run
    const shuffledLevelQuestions = shuffleArray([...levelConfig.questions]); 
    
    if (shuffledLevelQuestions.length === 0) {
      alert("Für dieses Level sind keine Fragen verfügbar. Bitte wähle ein anderes Level.");
      return;
    }

    setCurrentLevelData(levelConfig);
    setCurrentQuestions(shuffledLevelQuestions);
    setQuestionIndex(0);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setSelectedOptionIndex(null);
    setAnswered(false); // Reset answered state for the first question
    setTimeLeft(QUESTION_TIME);
    setRunStartTime(Date.now());
    setGameState('playing');
  };

  // Function to handle answer selection as per outline
  const handleAnswer = useCallback((selectedIndex) => {
    if (answered) return; // Prevent multiple answers for the same question
    
    // Clear the main countdown timer when an answer is selected
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setAnswered(true);
    setSelectedOptionIndex(selectedIndex);

    const currentQuestion = currentQuestions[questionIndex];
    const isCorrect = selectedIndex === currentQuestion.correct;

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setScore(prev => prev + currentLevelData.pointsPerCorrectAnswer); // Use points from level config
    } else {
      setWrongCount(prev => prev + 1);
    }

    // Wait for 2 seconds before moving to the next question or ending the quiz
    setTimeout(() => {
      if (questionIndex < currentQuestions.length - 1) {
        setQuestionIndex(prev => prev + 1);
        setSelectedOptionIndex(null);
        setAnswered(false); // Reset for next question
        setTimeLeft(QUESTION_TIME); // Reset timer for next question
      } else {
        handleQuizEnd(); // End of Quiz
      }
    }, 2000); // 2 seconds delay as per outline
  }, [answered, currentQuestions, questionIndex, currentLevelData, handleQuizEnd]);

  // Effect for the question countdown timer
  useEffect(() => {
    // Don't run timer if not playing, or if an answer has already been given (handleAnswer's setTimeout takes over)
    if (gameState !== 'playing' || answered) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // If time runs out and no answer was selected
    if (timeLeft === 0) {
      setWrongCount(prev => prev + 1); // Increment wrong answers (unanswered questions count as wrong)
      // No score awarded for unanswered questions
      
      // Auto-advance to the next question or end the quiz
      if (questionIndex < currentQuestions.length - 1) {
        setQuestionIndex(prev => prev + 1);
        setSelectedOptionIndex(null);
        setAnswered(false);
        setTimeLeft(QUESTION_TIME);
      } else {
        handleQuizEnd();
      }
      return;
    }

    // Start or continue the countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    // Cleanup function to clear the interval when component unmounts or dependencies change
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeLeft, gameState, answered, currentQuestions.length, questionIndex, handleQuizEnd]);

  // Memoize current question for efficient rendering
  const currentQuestion = useMemo(() => {
    return currentQuestions[questionIndex];
  }, [currentQuestions, questionIndex]);

  if (isLoading) {
    return <div className="p-8 text-center"><LoadingSpinner /></div>;
  }
  
  // Display message if no quiz levels are configured (should not happen with embedded data)
  if (quizLevelsConfig.length === 0 && !isLoading) {
      return (
          <div className="p-8 max-w-2xl mx-auto text-center">
              <Card className="glass-morphism border-gray-800">
                  <CardHeader><CardTitle className="text-white">Keine Quizfragen gefunden</CardTitle></CardHeader>
                  <CardContent>
                      <p className="text-gray-400 mb-4">Der Fragenkatalog ist leer. Es gab ein Problem beim Laden der eingebetteten Fragen.</p>
                  </CardContent>
              </Card>
          </div>
      );
  }

  return (
    <div className="p-4 sm:p-8">
      <AnimatePresence mode="wait">
        {gameState === 'level-selection' && (
          <motion.div key="level-selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                <BrainCircuit className="w-8 h-8 text-emerald-400" /> Quiz-Zeit!
              </h1>
              <p className="text-gray-400 mb-8">Wähle deinen Schwierigkeitsgrad und sammle Punkte.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizLevelsConfig.map((level, index) => ( // Iterate through the new array structure
                  <Card key={level.key || index} className="glass-morphism border-gray-800 hover:border-emerald-500/50 transition-all">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-white mb-2">{level.name}</h3>
                      <p className="text-gray-400 mb-2">{level.description}</p>
                      <p className="text-gray-400 mb-4">Fragen: {level.questions.length} • Punkte/Frage: {level.pointsPerCorrectAnswer}</p>
                      <Button onClick={() => startQuiz(level)} className={`${level.color} w-full text-white`}>
                        Start
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && currentQuestion && (
          <motion.div key="playing" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-2xl mx-auto">
            <Card className="glass-morphism border-gray-800">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <Badge className={`${currentLevelData?.color || 'bg-gray-500'} text-white`}>{currentLevelData?.name}</Badge>
                  <div className="flex items-center gap-2 font-mono text-lg text-white">
                    <Clock className="w-5 h-5" /> {timeLeft}s
                  </div>
                </div>
                <Progress value={(questionIndex / currentQuestions.length) * 100} className="mt-4" />
                <p className="text-sm text-gray-400 text-center mt-2">Frage {questionIndex + 1} von {currentQuestions.length}</p>
              </CardHeader>
              <CardContent className="text-center">
                <h2 className="text-xl md:text-2xl font-semibold text-white mb-8">{currentQuestion.question}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {currentQuestion.options.map((option, idx) => { // Iterate through options array
                    let buttonClass = "bg-gray-800/50 border-gray-700 hover:bg-gray-700/70";
                    if (answered) { // Apply feedback styling only if an answer has been given
                        if (idx === currentQuestion.correct) {
                            buttonClass = "bg-green-500/80 border-green-400 text-white";
                        } else if (idx === selectedOptionIndex) { // If it was selected and wrong
                            buttonClass = "bg-red-500/80 border-red-400 text-white";
                        }
                    }
                    return (
                        <Button 
                            key={idx} 
                            onClick={() => handleAnswer(idx)} 
                            disabled={answered} // Disable button if an answer has already been selected
                            variant="outline" 
                            className={`h-auto p-4 rounded-xl text-white text-base justify-start text-left whitespace-normal ${buttonClass}`}
                        >
                            {option}
                        </Button>
                    );
                  })}
                </div>
                {/* The "Weiter" button is removed here as handleAnswer's setTimeout handles auto-progression. */}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {gameState === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center">
            <Card className="glass-morphism border-gray-800">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-white flex items-center justify-center gap-3">
                        <Award className="w-8 h-8 text-amber-400" /> Ergebnis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-emerald-400 mb-4">+{score} Punkte</p>
                    <div className="grid grid-cols-2 gap-4 text-left text-gray-300 mb-8 p-4 bg-gray-800/50 rounded-xl">
                        <div className="flex items-center gap-2"><Check className="w-5 h-5 text-green-500" /> Richtig: {correctCount}</div>
                        <div className="flex items-center gap-2"><X className="w-5 h-5 text-red-500" /> Falsch: {wrongCount}</div>
                        <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> Zeit: {Math.round((Date.now() - runStartTime) / 1000)}s</div>
                        <div className="flex items-center gap-2"><Award className="w-5 h-5 text-amber-500" /> Gesamtpunkte: {user?.quiz_points || 0}</div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={() => setGameState('level-selection')} variant="outline" className="w-full">
                            Neue Runde
                        </Button>
                        <Link to={createPageUrl("Shop")} className="w-full">
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                                <ShoppingCart className="w-4 h-4 mr-2" /> Zum Shop
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
