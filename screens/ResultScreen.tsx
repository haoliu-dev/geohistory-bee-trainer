import React, { useEffect, useState } from 'react';
import { QuestionResult, StudyAdvice } from '../types';
import { Button } from '../components/Button';
import { Trophy, RotateCcw, Check, X, List, TrendingDown, BookOpen, ExternalLink, Brain, Loader2 } from 'lucide-react';
import { generateStudyAdvice } from '../services/inference/operations';

interface ResultScreenProps {
  results: QuestionResult[];
  onRestart: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ results, onRestart }) => {
  const [advice, setAdvice] = useState<StudyAdvice | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchAdvice = async () => {
      try {
        const data = await generateStudyAdvice(results);
        if (mounted) {
          setAdvice(data);
          setLoadingAdvice(false);
        }
      } catch (e) {
        console.error("Error fetching advice", e);
        if (mounted) setLoadingAdvice(false);
      }
    };
    fetchAdvice();
    return () => { mounted = false; };
  }, [results]);

  const calculateScore = (r: QuestionResult) => {
    let score = 0;
    // Points for success
    if (r.success) {
      score += Math.max(1, 10 - (r.cluesUsed - 1));
    }
    // Deduction for incorrect attempts
    score -= (r.incorrectAttempts || 0) * 10;
    return score;
  };

  const totalScore = results.reduce((acc, curr) => acc + calculateScore(curr), 0);
  const correctCount = results.filter(r => r.success).length;
  const accuracyPercentage = Math.round((correctCount / results.length) * 100);

  return (
    <div className="flex flex-col items-center h-full max-w-4xl mx-auto px-4 py-8 overflow-y-auto">
      {/* Summary Card */}
      <div className="w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100 text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6 text-yellow-600">
          <Trophy className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Game Over!</h1>
        <p className="text-slate-500 mb-6">Here is how you performed</p>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-slate-50 rounded-2xl">
            <div className={`text-3xl font-bold ${totalScore < 0 ? 'text-red-600' : 'text-indigo-600'}`}>{totalScore}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Total Score</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl">
            <div className="text-3xl font-bold text-slate-800">{correctCount}/{results.length}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Correct</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl">
            <div className="text-3xl font-bold text-emerald-600">{accuracyPercentage}%</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Accuracy</div>
          </div>
        </div>

        <Button onClick={onRestart} size="lg" className="px-12">
          <RotateCcw className="w-5 h-5 mr-2" />
          Play Again
        </Button>
      </div>

      <div className="w-full grid md:grid-cols-2 gap-8 mb-8">
        {/* Performance Breakdown */}
        <div className="w-full">
          <h3 className="flex items-center text-lg font-bold text-slate-800 mb-4 px-2">
              <List className="w-5 h-5 mr-2 text-slate-400" />
              Round History
          </h3>
          <div className="space-y-3">
            {results.map((result, idx) => {
              const itemScore = calculateScore(result);
              return (
                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${result.success ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {result.success ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-slate-800 truncate pr-4">{result.subject}</h4>
                        <span className={`text-sm font-bold ${itemScore >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {itemScore > 0 ? '+' : ''}{itemScore} pts
                        </span>
                    </div>
                    <div className="text-sm text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>Clues: <span className="font-medium text-slate-700">{result.cluesUsed} / {result.cluesTotal}</span></span>
                        {result.incorrectAttempts > 0 && (
                           <span className="text-red-500 flex items-center">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              {result.incorrectAttempts} penalty (-{result.incorrectAttempts * 10})
                           </span>
                        )}
                        {!result.success && result.userAnswer && (
                            <span className="truncate">Final guess: <span className="line-through">{result.userAnswer}</span></span>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Coach Advice */}
        <div className="w-full">
            <h3 className="flex items-center text-lg font-bold text-slate-800 mb-4 px-2">
                <Brain className="w-5 h-5 mr-2 text-indigo-500" />
                AI Coach Feedback
            </h3>
            
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-50 rounded-full opacity-50 blur-3xl pointer-events-none"></div>

                {loadingAdvice ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
                        <p>Analyzing your weak points...</p>
                    </div>
                ) : advice ? (
                    <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-2">Analysis</h4>
                            <p className="text-slate-700 leading-relaxed">
                                {advice.overallFeedback}
                            </p>
                        </div>

                        <div className="mb-6">
                             <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-3">Focus Areas</h4>
                             <div className="flex flex-wrap gap-2">
                                {advice.weakAreas.map((area, i) => (
                                    <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full border border-indigo-100">
                                        {area}
                                    </span>
                                ))}
                             </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-3">Recommended Reading</h4>
                            <div className="space-y-3">
                                {advice.studyResources.map((res, i) => (
                                    <a 
                                        key={i} 
                                        href={res.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="group flex items-start p-3 rounded-lg bg-slate-50 hover:bg-white hover:shadow-md hover:border-indigo-200 border border-transparent transition-all duration-200"
                                    >
                                        <div className="mt-1 flex-shrink-0 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        <div className="ml-3">
                                            <h5 className="font-semibold text-slate-800 group-hover:text-indigo-700 flex items-center">
                                                {res.title}
                                                <ExternalLink className="w-3 h-3 ml-1.5 opacity-50" />
                                            </h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{res.description}</p>
                                        </div>
                                    </a>
                                ))}
                                {advice.studyResources.length === 0 && (
                                    <p className="text-sm text-slate-500 italic">No specific readings found. Good job!</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-400">
                        <p>Unable to generate advice at this time.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
