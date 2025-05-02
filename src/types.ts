import { CoreMessage } from "ai";

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

type TestingAgentResponseFinishTest = {
  type: TestingAgentResponseType.FinishTest;
  success: boolean;
  reasoning: string | null;
  metCriteria: string[];
  unmetCriteria: string[];
  triggeredFailures: string[];
};

export type TestingAgentResponse =
  | TestingAgentResponseMessage
  | TestingAgentResponseFinishTest;

export type MaxTurnsExceeded = {
  success: false;
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
}
