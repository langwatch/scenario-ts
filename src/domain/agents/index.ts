import { CoreMessage } from "ai";
import { ScenarioExecutionStateInterface, ScenarioResult } from "../core/execution";

export enum ScenarioAgentRole {
  USER = "User",
  AGENT = "Agent",
  JUDGE = "Judge",
}

export const allAgentRoles = [ScenarioAgentRole.USER, ScenarioAgentRole.AGENT, ScenarioAgentRole.JUDGE] as const;

export interface AgentInput {
  threadId: string;
  messages: CoreMessage[];
  newMessages: CoreMessage[];
  requestedRole: ScenarioAgentRole;
  scenarioState: ScenarioExecutionStateInterface;
}

export type AgentReturnTypes = string | CoreMessage | CoreMessage[] | ScenarioResult;

export interface ScenarioAgentAdapter {
  roles: ScenarioAgentRole[];

  call(input: AgentInput): Promise<AgentReturnTypes>;
}

export abstract class UserSimulatorAgentAdapter implements ScenarioAgentAdapter {
  roles: ScenarioAgentRole[] = [ScenarioAgentRole.USER];

  constructor(input: AgentInput) {
    void input;
  }

  abstract call(input: AgentInput): Promise<AgentReturnTypes>;
}

export abstract class JudgeAgentAdapter implements ScenarioAgentAdapter {
  roles: ScenarioAgentRole[] = [ScenarioAgentRole.JUDGE];
  abstract criteria: string[];

  constructor(input: AgentInput) {
    void input;
  }

  abstract call(input: AgentInput): Promise<AgentReturnTypes>;
}
