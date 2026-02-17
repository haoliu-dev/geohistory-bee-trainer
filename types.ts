export enum GameCategory {
  HISTORY = 'History',
  GEOGRAPHY = 'Geography'
}

export enum DifficultyLevel {
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  COLLEGE = 'COLLEGE',
  PROFESSIONAL = 'PROFESSIONAL'
}

export enum GameStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export interface QuizItem {
  id: string;
  subject: string;
  acceptedAnswers: string[];
  clues: string[];
  category: string;
  difficulty?: string;
}

export interface GameConfig {
  category: GameCategory;
  questionCount: number;
  scope: string;
  difficulty: DifficultyLevel;
}

export interface QuestionResult {
  questionIndex: number;
  subject: string;
  cluesTotal: number;
  cluesUsed: number;
  incorrectAttempts: number;
  success: boolean;
  userAnswer?: string;
}

export interface GameState {
  status: GameStatus;
  questions: QuizItem[];
  currentIndex: number;
  currentCluesRevealed: number;
  results: QuestionResult[];
}

export interface StudyAdvice {
  overallFeedback: string;
  weakAreas: string[];
  studyResources: {
    title: string;
    url: string;
    description: string;
  }[];
}