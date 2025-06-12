import { CoreMessage } from "ai";

export interface ScenarioResult {
  success: boolean;
  messages: CoreMessage[];
  reasoning?: string;
  passedCriteria: string[];
  failedCriteria: string[];
  totalTime?: number;
  agentTime?: number;
}

export interface ScenarioExecutionStateInterface {
  history: CoreMessage[];
  threadId: string;
  turn: number | null;
  addMessage(message: CoreMessage, fromAgentIdx?: number): void;
  addMessages(messages: CoreMessage[], fromAgentIdx?: number): void;
}
