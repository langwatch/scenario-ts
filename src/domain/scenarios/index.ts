import { CoreMessage } from "ai";
import { type ScenarioExecution } from "../../scenario-execution/scenario-execution";
import { ScenarioAgentAdapter } from "../agents/index";
import { ScenarioResult } from "../core/execution";

export interface ScenarioConfig {
  id?: string;
  name: string;
  description: string;

  agents: ScenarioAgentAdapter[];
  script: ScriptStep[];

  maxTurns?: number;

  verbose?: boolean | number;
  cacheKey?: string;
  debug?: boolean;

  threadId?: string;
}

export interface ScenarioScriptContext {
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

export type ScriptStep = (context: ScenarioScriptContext) => Promise<void | ScenarioResult | null> | void | ScenarioResult | null;
