import { CoreMessage } from "ai";
import type { modelRegistry } from "../modelRegistry";

export interface CriterionStatus {
  criterion: string;
  met: boolean;
  reason: string;
}

export enum TestingAgentResponseType {
  Message = "message",
  FinishTest = "finish_test",
}

type TestingAgentResponseMessage = {
  type: TestingAgentResponseType.Message;
  message: string;
};

export enum Verdict {
  Success = "success",
  Failure = "failure",
  Inconclusive = "inconclusive",
}

export type TestingAgentResponseFinishTest = {
  type: TestingAgentResponseType.FinishTest;
  verdict: Verdict;
  reasoning: string | null;
  metCriteria: string[];
  unmetCriteria: string[];
  triggeredFailures: string[];
};

export type TestingAgentResponse =
  | TestingAgentResponseMessage
  | TestingAgentResponseFinishTest;

export type MaxTurnsExceeded = {
  type: "MAX_TURNS_EXCEEDED";
  verdict: Verdict.Failure;
  conversation: CoreMessage[];
  reasoning: string;
  totalTime: number;
};

export type ScenarioResult = MaxTurnsExceeded | TestingAgentResponseFinishTest;

export interface ScenarioConfig {
  description: string;
  strategy: string;
  successCriteria: string[];
  failureCriteria: string[];
}

export interface TestableAgent {
  invoke(prompt: string): Promise<{ message: string }>;
}

export interface TestingAgent {
  invoke(conversation: CoreMessage[]): Promise<TestingAgentResponse>;
}

export interface RunOptions {
  agent: TestableAgent;
  maxTurns?: number;
  verbose?: boolean;
  debug?: boolean;
}

export interface ModelConfig {
  modelId: Parameters<typeof modelRegistry.languageModel>[0];
  temperature: number;
  maxTokens: number;
}
