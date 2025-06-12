import { LanguageModel } from "ai";

export interface TestingAgentConfig {
  name?: string;
  model: LanguageModel;
  temperature?: number;
  maxTokens?: number;
}

export interface ScenarioData {
  description?: string;
  criteria?: string[];
  maxTurns?: number;
}

export interface FinishTestArgs {
  criteria: Record<string, boolean | "inconclusive">;
  reasoning: string;
  verdict: "success" | "failure" | "inconclusive";
}
