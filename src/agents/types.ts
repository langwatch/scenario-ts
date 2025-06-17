import { LanguageModel } from "ai";

export interface TestingAgentInferenceConfig {
  model?: LanguageModel;
  temperature?: number;
  maxTokens?: number;
}

export interface TestingAgentConfig extends TestingAgentInferenceConfig {
  name?: string;
}

export interface FinishTestArgs {
  criteria: Record<string, boolean | "inconclusive">;
  reasoning: string;
  verdict: "success" | "failure" | "inconclusive";
}
