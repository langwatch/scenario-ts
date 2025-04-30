export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResponse {
  messages: Message[];
}

export type AgentFunction = (message: string, history: Message[]) => Promise<AgentResponse>;

export type Criterion = string | ((history: Message[]) => boolean);

export interface ScenarioResult {
  success: boolean;
  history: Message[];
  turns: number;
  failureReason?: string;
}

export interface ScenarioConfig {
  maxTurns?: number;
  debug?: boolean;
  verbose?: boolean;
  cacheKey?: string;
}

export const DEFAULT_CONFIG: ScenarioConfig = {
  maxTurns: 10,
  debug: false,
  verbose: false,
}; 