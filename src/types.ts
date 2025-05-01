export interface RunOptions {
  agent: TestableAgent;
  customTestingAgent?: TestingAgent;
  maxTurns?: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface CriterionStatus {
  criterion: string;
  met: boolean;
  reason: string;
}

export interface TestingAgentResponse {
  message: string | null; // null means end conversation
  criteria: CriterionStatus[];
}

export interface TestableAgent {
  invoke(message: string, history: Message[]): Promise<string>;
}

export interface TestingAgent {
  invoke(message: string, history: Message[]): Promise<TestingAgentResponse>;
}

export interface ScenarioConfig {
  successCriteria: string[];
  failureCriteria: string[];
}

export enum ScenarioResultReason {
  FailureCriteriaMet = "failure criteria met",
  MaxTurnsExceeded = "max turns exceeded",
  AllSuccessCriteriaMet = "all success criteria met",
}

export interface ScenarioCompletedResult {
  success: boolean;
  history: Message[];
  reason:
    | ScenarioResultReason.AllSuccessCriteriaMet
    | ScenarioResultReason.FailureCriteriaMet;
  criteria: CriterionStatus[];
}

export interface ScenarioMaxTurnsResult {
  success: boolean;
  history: Message[];
  reason: ScenarioResultReason.MaxTurnsExceeded;
}

export type ScenarioResult = ScenarioCompletedResult | ScenarioMaxTurnsResult;
