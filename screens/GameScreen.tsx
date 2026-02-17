import React, { useState, useEffect, useRef } from 'react';
import { QuizItem, QuestionResult } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ChevronRight, HelpCircle, CheckCircle2, XCircle, AlertCircle, Loader2, ArrowRight, Send, CornerDownLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { checkAnswerWithAI } from '../services/inference/operations';

interface GameScreenProps {
  questions: QuizItem[];
  currentIndex: number;
  onFinish: (results: QuestionResult[]) => void;
}

interface ScoreAnimation {
  id: number;
  value: number;
  text: string;
}

export const GameScreen: React.FC<GameScreenProps> = ({ questions, currentIndex, onFinish }) => {
  // Use internal index to manage question progression
  const [internalIndex, setInternalIndex] = useState(currentIndex || 0);
  
  const [clueIndex, setClueIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'giveup' | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  
  // Scoring State
  const [score, setScore] = useState(0);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [animations, setAnimations] = useState<ScoreAnimation[]>([]);
  
  const activeQuestion = questions[internalIndex];
  const inputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // Reset state when internalIndex changes (new question)
  useEffect(() => {
    setClueIndex(0);
    setUserInput('');
    setFeedback(null);
    setShowAnswer(false);
    setIsChecking(false);
    setIncorrectAttempts(0);
    // Focus input on new question
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [internalIndex]);

  // Focus next button when answer is shown
  useEffect(() => {
    if (showAnswer) {
      setTimeout(() => nextButtonRef.current?.focus(), 100);
    }
  }, [showAnswer]);

  const triggerScoreAnimation = (value: number) => {
    const id = Date.now();
    const text = value > 0 ? `+${value}` : `${value}`;
    setAnimations(prev => [...prev, { id, value, text }]);
    
    // Remove animation after 1 second
    setTimeout(() => {
      setAnimations(prev => prev.filter(a => a.id !== id));
    }, 1000);
  };

  const handleNextClue = () => {
    if (clueIndex < activeQuestion.clues.length - 1) {
      setClueIndex(prev => prev + 1);
      // Keep focus on input after revealing clue
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleGuess = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() || isChecking) return;

    setIsChecking(true);

    try {
      const isCorrect = await checkAnswerWithAI(
        userInput,
        activeQuestion.subject,
        activeQuestion.acceptedAnswers,
        activeQuestion.category
      );

      if (isCorrect) {
        const pointsGained = Math.max(1, 10 - clueIndex);
        setScore(prev => prev + pointsGained);
        triggerScoreAnimation(pointsGained);
        setFeedback('correct');
        handleRoundEnd(true);
      } else {
        // Penalty for incorrect answer
        const penalty = -10;
        setScore(prev => prev + penalty);
        triggerScoreAnimation(penalty);
        setIncorrectAttempts(prev => prev + 1);
        
        setFeedback('incorrect');
        // Briefly show incorrect state then clear it to allow retry
        setTimeout(() => setFeedback(null), 1000);
      }
    } catch (error) {
      console.error("Guess handling error:", error);
      setFeedback('incorrect');
      setTimeout(() => setFeedback(null), 1000);
    } finally {
      setIsChecking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If we are already checking or showing answer, ignore
    if (showAnswer || isChecking) return;

    if (e.key === 'Enter') {
      if (!userInput.trim()) {
        // If empty, prevent default submit and reveal clue
        e.preventDefault();
        handleNextClue();
      }
    }
  };

  const handleGiveUp = () => {
    setFeedback('giveup');
    handleRoundEnd(false);
  };

  const handleRoundEnd = (success: boolean) => {
    setShowAnswer(true);
    const result: QuestionResult = {
      questionIndex: internalIndex,
      subject: activeQuestion.subject,
      cluesTotal: activeQuestion.clues.length,
      cluesUsed: clueIndex + 1,
      incorrectAttempts: incorrectAttempts, // Track attempts for final analysis
      success,
      userAnswer: userInput
    };
    
    setResults(prev => [...prev, result]);
  };

  const onNextClick = () => {
    if (internalIndex < questions.length - 1) {
      setInternalIndex(prev => prev + 1);
    } else {
      onFinish(results);
    }
  };

  const activeClues = activeQuestion.clues.slice(0, clueIndex + 1);
  const isLastClue = clueIndex === activeQuestion.clues.length - 1;
  const potentialScore = Math.max(0, 10 - clueIndex);
  const hasInput = userInput.trim().length > 0;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">{activeQuestion.category}</span>
          <h2 className="text-xl font-bold text-slate-800">
            Question {internalIndex + 1} <span className="text-slate-400 font-normal">/ {questions.length}</span>
          </h2>
        </div>
        
        {/* Score Display with Animations */}
        <div className="relative flex items-center gap-4">
           <div className="text-right">
             <div className="text-sm text-slate-500">Total Score</div>
             <div className={`font-bold text-2xl transition-colors duration-300 ${score < 0 ? 'text-red-600' : 'text-indigo-600'}`}>
               {score}
             </div>
           </div>
           
           {/* Floating Points Container */}
           <div className="absolute right-0 top-0 w-full h-full pointer-events-none">
              {animations.map(anim => (
                <div 
                  key={anim.id}
                  className={`absolute right-0 top-0 font-bold text-2xl ${
                    anim.value > 0 ? 'text-emerald-500 animate-float-up' : 'text-red-500 animate-float-down'
                  }`}
                  style={{ textShadow: '0 2px 4px rgba(255,255,255,0.8)' }}
                >
                  {anim.text}
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 overflow-y-auto mb-6 space-y-4">
        {activeClues.map((clue, idx) => (
          <div 
            key={idx}
            className={`p-4 rounded-xl border-l-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 ${
              idx === clueIndex 
                ? 'bg-white border-indigo-500 ring-1 ring-indigo-100' 
                : 'bg-slate-50 border-slate-300 opacity-75'
            }`}
          >
            <div className="flex gap-3">
              <div className="mt-0.5 min-w-[24px] h-6 flex items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                {idx + 1}
              </div>
              <p className="text-slate-800 leading-relaxed">{clue}</p>
            </div>
          </div>
        ))}
        
        {/* Helper text for next clue */}
        {!showAnswer && !isLastClue && (
          <div className="text-center py-4">
             <button 
                type="button"
                onClick={handleNextClue}
                className="text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
             >
                <HelpCircle className="w-4 h-4" />
                Reveal next clue (Press Enter with empty input)
                <span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-400">-1 pt potential</span>
             </button>
          </div>
        )}
      </div>

      {/* Answer Section */}
      <div className="mt-auto bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
        {showAnswer ? (
          <div className="text-center animate-in zoom-in-95 duration-300">
            {feedback === 'correct' ? (
              <div className="flex flex-col items-center text-emerald-600 mb-4">
                <CheckCircle2 className="w-12 h-12 mb-2" />
                <h3 className="text-2xl font-bold">Correct!</h3>
                <p className="text-slate-600 mt-1">
                    Answer: <span className="font-semibold text-slate-900">{activeQuestion.subject}</span>
                </p>
                <div className="mt-2 text-sm bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">
                    +{Math.max(1, 10 - clueIndex)} Points
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-red-500 mb-4">
                <XCircle className="w-12 h-12 mb-2" />
                <h3 className="text-2xl font-bold">Round Over</h3>
                <p className="text-slate-600 mt-1">
                    The answer was: <span className="font-bold text-slate-900">{activeQuestion.subject}</span>
                </p>
              </div>
            )}
            
            <Button 
                ref={nextButtonRef}
                onClick={onNextClick} 
                fullWidth 
                size="lg"
            >
              <div className="flex items-center justify-center gap-2">
                <span>{internalIndex < questions.length - 1 ? "Next Question" : "Finish Game"}</span>
                <span className="flex items-center text-xs bg-white/20 px-2 py-0.5 rounded font-normal opacity-90">
                    <CornerDownLeft className="w-3 h-3 mr-1" /> Enter
                </span>
              </div>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleGuess} className="flex flex-col gap-4">
            <div className="relative">
              <Input
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isLastClue ? "Type your answer..." : "Type answer or press Enter to skip..."}
                disabled={showAnswer || isChecking}
                autoComplete="off"
                className="pr-24"
                error={feedback === 'incorrect' ? 'Incorrect (-10 pts), try again or ask for a clue.' : undefined}
              />
              <div className="absolute right-2 top-2 bottom-2 flex items-center gap-2">
                  <div className="flex items-center px-2 py-1 bg-slate-50 rounded text-xs border border-slate-100">
                    <span className="text-emerald-600 font-bold flex items-center mr-2" title="Points for correct answer">
                      <TrendingUp className="w-3 h-3 mr-1" /> +{potentialScore}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-red-500 font-bold flex items-center ml-2" title="Penalty for incorrect answer">
                      <TrendingDown className="w-3 h-3 mr-1" /> -10
                    </span>
                  </div>
              </div>
            </div>
            
            {/* Dynamic interaction hint */}
            {!showAnswer && (
              <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                <div className="flex items-center gap-1 transition-colors duration-200">
                  {hasInput ? (
                    <>
                      <Send className="w-3 h-3" /> Press <strong>Enter</strong> to submit
                    </>
                  ) : !isLastClue ? (
                    <>
                      <ArrowRight className="w-3 h-3" /> Press <strong>Enter</strong> for next clue
                    </>
                  ) : null}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleGiveUp}
                disabled={isChecking}
              >
                Give Up
              </Button>
              <Button 
                type="submit" 
                disabled={!userInput.trim() || isChecking}
              >
                {isChecking ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </span>
                ) : "Submit Guess"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
