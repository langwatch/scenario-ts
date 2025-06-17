import { CoreMessage } from "ai";
import { type ScenarioExecution } from "../../scenario-execution/scenario-execution";
import { AgentAdapter } from "../agents/index";
import { ScenarioResult } from "../core/execution";

export interface ScenarioConfig {
  id?: string;
  name: string;
  description: string;

  agents: AgentAdapter[];
  script: ScriptStep[];

  verbose?: boolean | number;
  maxTurns?: number;

  threadId?: string;
}

export interface ScenarioExecutionLike {
  readonly history: CoreMessage[];
  readonly threadId: string;
  readonly turn: number;

  message(message: CoreMessage): Promise<void>;
  user(content?: string | CoreMessage): Promise<void>;
  agent(content?: string | CoreMessage): Promise<void>;
  judge(content?: string | CoreMessage): Promise<ScenarioResult | null>;
  proceed(
    turns?: number,
    onTurn?: (executor: ScenarioExecution) => void | Promise<void>,
    onStep?: (executor: ScenarioExecution) => void | Promise<void>,
  ): Promise<ScenarioResult | null>;
  succeed(): Promise<ScenarioResult>;
  fail(): Promise<ScenarioResult>;
}

export type ScriptStep = (context: ScenarioExecutionLike) => Promise<void | ScenarioResult | null> | void | ScenarioResult | null;
