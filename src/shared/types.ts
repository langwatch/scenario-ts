import { CoreMessage } from "ai";

/**
 * Verdict enum represents the possible outcomes of a test scenario
 */
export enum Verdict {
  Success = "success",
  Failure = "failure",
  Inconclusive = "inconclusive",
  Error = "error",
}

/**
 * Agent interfaces
 */
export interface TestableAgent {
  invoke(prompt: string): Promise<{ message: string }>;
}

export interface TestingAgent {
  invoke(
    conversation: CoreMessage[],
    options?: {
      /**
       * Callback function to handle the test result
       * @param results - The test result
       */
      onFinishTest?: (results: ScenarioResult) => void;
    }
  ): Promise<TestingAgentResponse>;
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

export type ScenarioResult = {
  verdict: Verdict;
  reasoning: string | null;
  metCriteria: string[];
  unmetCriteria: string[];
  triggeredFailures: string[];
};

export interface TestingAgentResponse {
  text: string;
}

