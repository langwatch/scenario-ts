import { CoreMessage } from "ai";
import { ScenarioExecutionStateInterface, ScenarioResult } from "../core/execution";

export enum ScenarioAgentRole {
  USER = "User",
  AGENT = "Agent",
  JUDGE = "Judge",
}

export interface AgentInput {
  threadId: string;
  messages: CoreMessage[];
  newMessages: CoreMessage[];
  context: Record<string, unknown>;
  requestedRole: ScenarioAgentRole;
  scenarioState: ScenarioExecutionStateInterface;
}

export type AgentReturnTypes = string | CoreMessage | CoreMessage[] | ScenarioResult;

export abstract class ScenarioAgentAdapter {
  roles: ScenarioAgentRole[] = [ScenarioAgentRole.AGENT];

  constructor(input: AgentInput) {
    // Prevent unused parameter warning
    void input;
  }

  abstract call(input: AgentInput): Promise<AgentReturnTypes>;
}
