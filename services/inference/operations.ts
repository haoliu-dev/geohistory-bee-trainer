import { DifficultyLevel, GameCategory, QuestionResult, QuizItem, StudyAdvice } from '../../types';
import { generateJson, generateText } from './inferenceService';

const QUIZ_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    quizzes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          subject: {
            type: 'string',
            description: "The main answer (e.g., 'Napoleon Bonaparte', 'Amazon River').",
          },
          acceptedAnswers: {
            type: 'array',
            items: { type: 'string' },
            description: "List of valid alternative names or spellings (e.g., ['Napoleon', 'Bonaparte']).",
          },
          clues: {
            type: 'array',
            items: { type: 'string' },
            description: '5 to 8 facts about the subject, ordered from most obscure/difficult to most obvious.',
          },
          category: {
            type: 'string',
            description: 'The category of the question (History or Geography).',
          },
          difficulty: {
            type: 'string',
            description: 'Estimated difficulty level.',
          },
        },
        required: ['subject', 'acceptedAnswers', 'clues', 'category'],
      },
    },
  },
  required: ['quizzes'],
};

const ADVICE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    overallFeedback: {
      type: 'string',
      description:
        'A brief, encouraging summary (2-3 sentences) identifying the specific historical/geographical eras or regions the user struggled with.',
    },
    weakAreas: {
      type: 'array',
      items: { type: 'string' },
      description:
        "A list of 3-5 specific short keywords or topics to study (e.g., 'Napoleonic Wars', 'Rivers of South America').",
    },
    studyResources: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title of the article or topic.' },
          url: { type: 'string', description: 'A valid URL (prefer Wikipedia) to read about this topic.' },
          description: {
            type: 'string',
            description: 'Very short reason why this is relevant based on their mistakes.',
          },
        },
        required: ['title', 'url', 'description'],
      },
      description: 'List of 3-5 specific reading links.',
    },
  },
  required: ['overallFeedback', 'weakAreas', 'studyResources'],
};

const getAudienceDescription = (category: GameCategory, difficulty: DifficultyLevel): string => {
  if (category === GameCategory.GEOGRAPHY) {
    switch (difficulty) {
      case DifficultyLevel.HIGH_SCHOOL:
        return 'High School Student';
      case DifficultyLevel.COLLEGE:
        return 'College Geography Major';
      case DifficultyLevel.PROFESSIONAL:
        return 'Professional Geographer';
    }
  }

  switch (difficulty) {
    case DifficultyLevel.HIGH_SCHOOL:
      return 'High School Student';
    case DifficultyLevel.COLLEGE:
      return 'College History Major';
    case DifficultyLevel.PROFESSIONAL:
      return 'Professional Historian';
  }
};

export const extractScopeFromContent = async (content: string, category: GameCategory): Promise<string> => {
  const prompt = `
    Analyze the following text from study materials uploaded by a user for a ${category} quiz.

    TEXT CONTENT (truncated if too long):
    "${content.slice(0, 50000)}"

    Task:
    Extract a concise, comma-separated list of the key specific topics, eras, regions, or themes present in this text that can serve as a "Scope" for generating a quiz.
    Ignore metadata, prefaces, or irrelevant text.
    The output should be a string of keywords (e.g., "American Revolution, French Monarchy, 19th Century Industrialization").
    Limit the summary to max 50 words.
  `;

  try {
    return await generateText({ prompt });
  } catch (error) {
    console.error('Failed to extract scope:', error);
    return 'Custom File Content';
  }
};

export const generateQuiz = async (
  category: GameCategory,
  count: number,
  scope: string,
  difficulty: DifficultyLevel
): Promise<QuizItem[]> => {
  const scopeText = scope.trim() === '*' || scope.trim() === '' ? 'general knowledge' : scope;
  const audience = getAudienceDescription(category, difficulty);

  const prompt = `
    Generate ${count} challenging quiz items for a ${category} Bee competition.
    Target Audience Difficulty Level: "${audience}".
    Scope/Keywords: "${scopeText}".

    CRITICAL SUBJECT SELECTION RULE:
    - The Subject MUST be known by at least 50% of the intended audience (${audience}).
    - ${difficulty === DifficultyLevel.HIGH_SCHOOL ? 'Focus on standard curriculum topics, famous figures, major wars, and major capitals/landmarks.' : ''}
    - ${difficulty === DifficultyLevel.COLLEGE ? 'Focus on undergraduate level depth, specific battles, treaties, lesser-known monarchs, cultural geography, or regional politics.' : ''}
    - ${difficulty === DifficultyLevel.PROFESSIONAL ? 'Focus on niche academic topics, specific historiography, minor but impactful historical figures, or specific geographical features, but ensuring they are not completely obscure to a professional.' : ''}

    For each item:
    1. Identify a specific subject (person, place, event, battle, treaty, landform, city, etc.).
    2. Provide 5 to 8 clues.

    CRITICAL INSTRUCTIONS FOR CLUE GENERATION:
    - **Phrasing**: NEVER use pronouns like "It", "He", "She", or "They" to refer to the subject. ALWAYS use the specific type of the subject in the text, such as "This river...", "This monarch...", "This mountain range...", "This treaty...", "This city...".
    - **Difficulty Progression**: The clues MUST be strictly ordered from MOST DIFFICULT (obscure) to EASIEST (well-known).
      - Clue 1: An obscure fact (e.g., specific dates, minor figures involved, specific dimensions) that allows a true expert to answer immediately.
      - Middle Clues: Add context, location, or related events.
      - Final Clues: Major distinguishing features or famous associations.

    3. Provide a list of 'acceptedAnswers' to handle variations (e.g., last names, common abbreviations).
  `;

  try {
    const data = await generateJson<{ quizzes: Omit<QuizItem, 'id'>[] }>({
      prompt,
      schema: QUIZ_SCHEMA,
      systemInstruction:
        'You are an expert question writer for National History Bee and National Geography Bee competitions. You value accuracy, precision, and gradual revelation of information.',
    });

    return data.quizzes.map((q, index) => ({
      ...q,
      id: `quiz-${Date.now()}-${index}`,
    }));
  } catch (error) {
    console.error('Failed to generate quiz:', error);
    throw error;
  }
};

export const checkAnswerWithAI = async (
  userAnswer: string,
  subject: string,
  acceptedAnswers: string[],
  category: string
): Promise<boolean> => {
  const normalizedInput = userAnswer.toLowerCase().trim();
  const allValid = [subject, ...acceptedAnswers].map((s) => s.toLowerCase().trim());

  if (allValid.some((v) => normalizedInput === v)) {
    return true;
  }

  const prompt = `
    Task: Validate if the User's Answer is a correct identification of the Subject.
    Subject: "${subject}"
    Category: ${category}
    Alternate Names: ${acceptedAnswers.join(', ')}

    User Answer: "${userAnswer}"

    Rules for Correctness:
    - Accept widely used nicknames or short forms (e.g., "TR" for "Theodore Roosevelt").
    - Accept phonetic spelling or local pronunciations.
    - Accept minor misspellings.
    - Accept translations if common.
    - Reject if the answer represents a distinct, incorrect entity.

    Output strictly JSON: { "correct": boolean }
  `;

  try {
    const json = await generateJson<{ correct: boolean }>({
      prompt,
      power: 'light',
    });

    return json.correct === true;
  } catch (e) {
    console.warn('AI verification failed, defaulting to false', e);
    return false;
  }
};

export const generateStudyAdvice = async (results: QuestionResult[]): Promise<StudyAdvice> => {
  const weakPoints = results.filter((r) => !r.success || r.incorrectAttempts > 0 || r.cluesUsed > 3);

  const itemsToAnalyze =
    weakPoints.length > 0 ? weakPoints : [...results].sort((a, b) => b.cluesUsed - a.cluesUsed).slice(0, 3);

  const analysisData = itemsToAnalyze.map((r) => ({
    subject: r.subject,
    userAnswer: r.userAnswer || 'No Answer',
    wasCorrect: r.success,
    incorrectGuesses: r.incorrectAttempts,
    cluesNeeded: r.cluesUsed,
  }));

  const prompt = `
    Analyze the following quiz performance results for a Geography/History Bee student.

    Performance Data:
    ${JSON.stringify(analysisData, null, 2)}

    Task:
    1. Identify the specific knowledge gaps (e.g., "Weakness in 19th Century French Politics" or "Unfamiliar with African River Systems").
    2. Provide constructive feedback.
    3. Suggest specific Wikipedia articles that would fill these gaps.

    If the user performed perfectly, suggest advanced related topics to study next.
  `;

  try {
    return await generateJson<StudyAdvice>({
      prompt,
      schema: ADVICE_SCHEMA,
      systemInstruction:
        'You are a helpful study coach for academic competitions. You provide specific, actionable reading lists with valid Wikipedia URLs.',
    });
  } catch (error) {
    console.error('Failed to generate advice', error);
    return {
      overallFeedback: 'Great effort! Keep reviewing general topics to broaden your knowledge base.',
      weakAreas: ['General Knowledge'],
      studyResources: [],
    };
  }
};
