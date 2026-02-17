import { InferenceJsonRequest, InferenceTextRequest } from './types';

export interface InferenceProvider {
  generateText(request: InferenceTextRequest): Promise<string>;
  generateJson<T>(request: InferenceJsonRequest): Promise<T>;
}
