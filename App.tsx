import React, { useState } from 'react';
import { DifficultyLevel, GameCategory, GameConfig, GameStatus, QuizItem, QuestionResult } from './types';
import { generateQuiz } from './services/inference/operations';
import { StartScreen } from './screens/StartScreen';
import { GameScreen } from './screens/GameScreen';
import { ResultScreen } from './screens/ResultScreen';
import { getResolvedAppConfig } from './services/config/appConfig';

const resolveDefaultGameConfig = (): GameConfig => {
  const defaults = getResolvedAppConfig().gameplayDefaults;
  return {
    category: defaults.category ?? GameCategory.HISTORY,
    questionCount: defaults.questionCount ?? 10,
    scope: defaults.scope ?? '*',
    difficulty: defaults.difficulty ?? DifficultyLevel.HIGH_SCHOOL,
  };
};

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [questions, setQuestions] = useState<QuizItem[]>([]);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [lastConfig, setLastConfig] = useState<GameConfig>(resolveDefaultGameConfig());

  const handleStartGame = async (config: GameConfig) => {
    setLastConfig(config);
    setStatus(GameStatus.LOADING);
    try {
      const quizItems = await generateQuiz(
        config.category,
        config.questionCount,
        config.scope,
        config.difficulty
      );
      setQuestions(quizItems);
      setResults([]);
      setStatus(GameStatus.PLAYING);
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Failed to generate quiz. Please check your provider configuration and try again.');
      setStatus(GameStatus.IDLE);
    }
  };

  const handleGameFinish = (finalResults: QuestionResult[]) => {
    setResults(finalResults);
    setStatus(GameStatus.FINISHED);
  };

  const handleRestart = () => {
    setStatus(GameStatus.IDLE);
    setQuestions([]);
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {(status === GameStatus.IDLE || status === GameStatus.LOADING) && (
        <StartScreen
          onStart={handleStartGame}
          isLoading={status === GameStatus.LOADING}
          initialConfig={lastConfig}
        />
      )}

      {status === GameStatus.PLAYING && questions.length > 0 && (
        <GameScreen
          questions={questions}
          currentIndex={0}
          onFinish={handleGameFinish}
        />
      )}

      {status === GameStatus.FINISHED && (
        <ResultScreen results={results} onRestart={handleRestart} />
      )}
    </div>
  );
};

export default App;
