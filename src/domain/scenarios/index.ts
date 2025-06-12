import { CoreMessage } from "ai";
import { ScenarioAgentAdapter } from "../agents/index";
import { ScenarioResult } from "../core/execution";

export interface ScenarioConfig {
  name: string;
  description: string;
  criteria: string[];
  agents: ScenarioAgentAdapter[];
  testingAgent?: ScenarioAgentAdapter;
  maxTurns?: number;
  verbose?: boolean | number;
  cacheKey?: string;
  debug?: boolean;
}

interface ScenarioConstructorBase {
  name: string;
  description: string;
  criteria?: string[];
  maxTurns?: number;
  verbose?: boolean | number;
  cacheKey?: string;
  debug?: boolean;
}

export interface ScenarioConstructorOptionsSingleAgent extends ScenarioConstructorBase {
  agent?: ScenarioAgentAdapter;
  testingAgent?: ScenarioAgentAdapter;
  agents?: never;
}

export interface ScenarioConstructorOptionsMultipleAgents extends ScenarioConstructorBase {
  agent?: never;
  agents?: ScenarioAgentAdapter[];
  testingAgent?: never;
}

export type ScenarioConstructorOptions = ScenarioConstructorOptionsSingleAgent | ScenarioConstructorOptionsMultipleAgents;

export interface ScenarioScriptContext {
  readonly history: CoreMessage[];
  readonly threadId: string;
  readonly turn: number;

  message(message: CoreMessage): Promise<void>;
  user(content?: string | CoreMessage): Promise<void>;
  agent(content?: string | CoreMessage): Promise<void>;
  judge(content?: string | CoreMessage): Promise<ScenarioResult | null>;
  proceed(turns?: number): Promise<ScenarioResult | null>;
  succeed(): Promise<ScenarioResult>;
  fail(): Promise<ScenarioResult>;
}

export type ScriptStep = (context: ScenarioScriptContext) => Promise<void | ScenarioResult | null> | void | ScenarioResult | null;
