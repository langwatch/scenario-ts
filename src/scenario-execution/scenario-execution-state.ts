import { CoreMessage, CoreToolMessage } from "ai";
import { ScenarioResult, ScenarioAgentRole, ScenarioAgentAdapter, allAgentRoles } from "../domain";

export class ScenarioExecutionState {
  private _history: CoreMessage[] = [];
  private _turn: number | null = null;
  private _partialResult: Omit<ScenarioResult, "messages"> | null = null;
  private _threadId: string = "";
  private _agents: ScenarioAgentAdapter[] = [];
  private _pendingMessages: Map<number, CoreMessage[]> = new Map();
  private _pendingRolesOnTurn: ScenarioAgentRole[] = [];
  private _pendingAgentsOnTurn: Set<ScenarioAgentAdapter> = new Set();
  private _agentTimes: Map<number, number> = new Map();
  private _totalStartTime: number = 0;

  constructor() {
    this._totalStartTime = Date.now();
  }

  setThreadId(threadId: string): void {
    this._threadId = threadId;
  }

  setAgents(agents: ScenarioAgentAdapter[]): void {
    this._agents = agents;
    this._pendingMessages.clear();
    this._agentTimes.clear();
  }

  appendMessage(role: CoreMessage["role"], content: string): void {
    const message: CoreMessage = { role, content } as CoreMessage;
    this._history.push(message);
  }

  appendUserMessage(content: string): void {
    this.appendMessage("user", content);
  }

  appendAssistantMessage(content: string): void {
    this.appendMessage("assistant", content);
  }

  addMessage(message: CoreMessage, fromAgentIdx?: number): void {
    this._history.push(message);

    for (let idx = 0; idx < this._agents.length; idx++) {
      if (idx === fromAgentIdx) continue;

      if (!this._pendingMessages.has(idx)) {
        this._pendingMessages.set(idx, []);
      }
      this._pendingMessages.get(idx)!.push(message);
    }
  }

  addMessages(messages: CoreMessage[], fromAgentIdx?: number): void {
    for (const message of messages) {
      this.addMessage(message, fromAgentIdx);
    }
  }

  getPendingMessages(agentIdx: number): CoreMessage[] {
    return this._pendingMessages.get(agentIdx) || [];
  }

  clearPendingMessages(agentIdx: number): void {
    this._pendingMessages.set(agentIdx, []);
  }

  newTurn(): void {
    this._pendingAgentsOnTurn = new Set(this._agents);

    // Only include roles that have corresponding agents
    const availableRoles: ScenarioAgentRole[] = [];

    for (const role of allAgentRoles) {
      if (this._agents.some(agent => agent.roles.includes(role))) {
        availableRoles.push(role);
      }
    }

    this._pendingRolesOnTurn = availableRoles;

    if (this._turn === null) {
      this._turn = 1;
    } else {
      this._turn++;
    }
  }

  removePendingRole(role: ScenarioAgentRole): void {
    const index = this._pendingRolesOnTurn.indexOf(role);
    if (index > -1) {
      this._pendingRolesOnTurn.splice(index, 1);
    }
  }

  removePendingAgent(agent: ScenarioAgentAdapter): void {
    this._pendingAgentsOnTurn.delete(agent);
  }

  getNextAgentForRole(role: ScenarioAgentRole): { index: number; agent: ScenarioAgentAdapter } | null {
    for (let i = 0; i < this._agents.length; i++) {
      const agent = this._agents[i];
      if (agent.roles.includes(role) && this._pendingAgentsOnTurn.has(agent)) {
        return { index: i, agent };
      }
    }
    return null;
  }

  addAgentTime(agentIdx: number, time: number): void {
    const currentTime = this._agentTimes.get(agentIdx) || 0;

    this._agentTimes.set(agentIdx, currentTime + time);
  }

  hasResult(): boolean {
    return this._partialResult !== null;
  }

  setResult(result: Omit<ScenarioResult, "messages">): void {
    this._partialResult = result;
  }

  get lastMessage(): CoreMessage | undefined {
    return this._history[this._history.length - 1];
  }

  get lastUserMessage(): CoreMessage | undefined {
    return this._history.findLast(message => message.role === "user");
  }

  get lastAssistantMessage(): CoreMessage | undefined {
    return this._history.findLast(message => message.role === "assistant");
  }

  get lastToolCall(): CoreToolMessage | undefined {
    return this._history.findLast(message => message.role === "tool");
  }

  getLastToolCallByToolName(toolName: string): CoreToolMessage | undefined {
    const toolMessage = this._history.findLast(message =>
      message.role === "tool" && message.content.find(
        part => part.type === "tool-result" && part.toolName === toolName
      ),
    );

    return toolMessage as CoreToolMessage | undefined;
  }

  hasToolCall(toolName: string): boolean {
    return this._history.some(message =>
      message.role === "tool" && message.content.find(
        part => part.type === "tool-result" && part.toolName === toolName
      ),
    );
  }

  get history(): CoreMessage[] {
    return this._history;
  }

  get historyWithoutLastMessage(): CoreMessage[] {
    return this._history.slice(0, -1);
  }

  get historyWithoutLastUserMessage(): CoreMessage[] {
    const lastUserMessageIndex = this._history.findLastIndex(message => message.role === "user");

    if (lastUserMessageIndex === -1) return this._history;

    return this._history.slice(0, lastUserMessageIndex);
  }

  get turn(): number | null {
    return this._turn;
  }

  get threadId(): string {
    return this._threadId;
  }

  get agents(): ScenarioAgentAdapter[] {
    return this._agents;
  }

  get pendingRolesOnTurn(): ScenarioAgentRole[] {
    return [...this._pendingRolesOnTurn];
  }

  get pendingAgentsOnTurn(): ScenarioAgentAdapter[] {
    return Array.from(this._pendingAgentsOnTurn);
  }

  get partialResult(): Omit<ScenarioResult, "messages"> | null {
    return this._partialResult;
  }

  get totalTime(): number {
    return Date.now() - this._totalStartTime;
  }

  get agentTimes(): Map<number, number> {
    return new Map(this._agentTimes);
  }
}
