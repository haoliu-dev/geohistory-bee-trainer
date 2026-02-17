import { DifficultyLevel, GameCategory } from '../../types';
import { InferenceProviderKind } from '../inference/types';

export type InferenceLevel = 'light' | 'normal';

export interface ProviderModels {
  light: string;
  normal: string;
}

export interface AppInferenceProviderConfig {
  baseURL?: string;
  apiKeyEnv?: string;
  apiKey?: string;
  models: ProviderModels;
}

export interface InferenceRouteConfig {
  provider: InferenceProviderKind;
  model: string;
}

export interface AppConfig {
  version: number;
  inference: {
    providers: Record<InferenceProviderKind, AppInferenceProviderConfig>;
    routing: Record<InferenceLevel, InferenceRouteConfig>;
  };
  gameplayDefaults: {
    category: GameCategory;
    difficulty: DifficultyLevel;
    questionCount: number;
    scope: string;
  };
}

export interface InferenceRoutingOverride {
  light: InferenceRouteConfig;
  normal: InferenceRouteConfig;
}
