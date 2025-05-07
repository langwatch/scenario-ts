import { CoreMessage } from "ai";

/**
 * Verdict enum represents the possible outcomes of a test scenario
 */
export enum Verdict {
  Success = "success",
  Failure = "failure",
  Inconclusive = "inconclusive",
}

/**
 * Agent interfaces
 */
export interface TestableAgent {
  invoke(prompt: string): Promise<{ message: string }>;
}

export interface TestingAgent {
  invoke(conversation: CoreMessage[]): Promise<TestingAgentResponse>;
}

/**
 * Scenario configuration and run options
 */
export interface ScenarioConfig {
  description: string;
  strategy: string;
  successCriteria: string[];
  failureCriteria: string[];
}

export interface RunOptions {
  agent: TestableAgent;
  maxTurns?: number;
}

/**
 * Criterion status tracking
 */
export interface CriterionStatus {
  criterion: string;
  met: boolean;
  reason: string;
}

/**
 * Testing agent response types
 */
export enum TestingAgentResponseType {
  Message = "message",
  FinishTest = "finish_test",
}

type TestingAgentResponseMessage = {
  type: TestingAgentResponseType.Message;
  message: string;
};

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

/**
 * Scenario result type
 */
export type ScenarioResult = TestingAgentResponseFinishTest;
