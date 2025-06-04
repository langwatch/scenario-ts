import { CoreMessage } from "ai";
import { ModelConfig } from "../model-registry";

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
  invoke(prompt: string): Promise<{ text: string }>;
}

export interface TestingAgent {
  invoke(
    conversation: CoreMessage[],
    options?: {
      /**
       * Callback function to handle the test result
       * @param results - The test result
       */
      onFinishTest?: (results: Omit<ScenarioResult, "conversation">) => void;
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
  onMessages?: (messages: CoreMessage[]) => void;
  onFinish?: (
    result: ScenarioResult &
      ScenarioConfig &
      TestingAgentConfig & {
        forceFinishTestMessage: string;
      }
  ) => void;
}

export type ScenarioResult = {
  verdict: Verdict;
  conversation: CoreMessage[];
  reasoning: string | null;
  metCriteria: string[];
  unmetCriteria: string[];
  triggeredFailures: string[];
};

export interface TestingAgentResponse {
  text: string;
}

export interface TestingAgentConfig extends ModelConfig {
  systemPrompt: string;
}
