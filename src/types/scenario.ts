import { MessageAdapterAgent, StringAdapterAgent } from "./agents";
import { Message } from "./messages";

export enum Verdict {
  Success = "success",
  Failure = "failure",
  Inconclusive = "inconclusive",
  Error = "error",
}

export interface ScenarioConfig {
  name: string;
  description: string;
  criteria: string[];
  agent: MessageAdapterAgent<unknown> | StringAdapterAgent<unknown>;
  defaults?: {
    maxTurns?: number;
  };
}

export type ScenarioResult = {
  verdict: Verdict;
  conversation: Message[];
  reasoning: string | null;
  metCriteria: string[];
  unmetCriteria: string[];
  triggeredFailures: string[];
};
