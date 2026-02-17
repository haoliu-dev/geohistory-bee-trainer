export type InferencePower = 'light' | 'normal';
export type InferenceProviderKind = 'gemini' | 'local_openai_compatible' | 'lmstudio';

export interface InferenceRequestBase {
  prompt: string;
  systemInstruction?: string;
  power?: InferencePower;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface InferenceTextRequest extends InferenceRequestBase {}

export interface InferenceJsonRequest extends InferenceRequestBase {
  schema?: Record<string, unknown>;
}

export class InferenceError extends Error {
  stage: 'request_build' | 'provider_call' | 'response_parse' | 'schema_validation';
  cause?: unknown;

  constructor(
    message: string,
    stage: 'request_build' | 'provider_call' | 'response_parse' | 'schema_validation',
    cause?: unknown
  ) {
    super(message);
    this.name = 'InferenceError';
    this.stage = stage;
    this.cause = cause;
  }
}
