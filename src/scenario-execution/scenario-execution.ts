import { CoreMessage } from "ai";
import { generate } from "xksuid";
import { ScenarioExecutionState } from "./scenario-execution-state";
import {
  type ScenarioResult,
  type ScenarioConfig,
  AgentRole,
  type AgentInput,
  type ScriptStep,
  type AgentReturnTypes,
  type ScenarioScriptContext,
  type AgentAdapter,
  JudgeAgentAdapter
} from "../domain";

function generateThreadId(): string {
  return `thread_${generate()}`;
}

function convertAgentReturnTypesToMessages(response: AgentReturnTypes, role: "user" | "assistant"): CoreMessage[] {
  if (typeof response === "string")
    return [{ role, content: response } as CoreMessage];

  if (Array.isArray(response))
    return response;

  if (typeof response === "object" && "role" in response)
    return [response];

  return [];
}

export class ScenarioExecution implements ScenarioScriptContext {
  private state: ScenarioExecutionState = new ScenarioExecutionState();
  private currentTurn: number = 0;

  constructor(
    public readonly config: ScenarioConfig,
    public readonly steps: ScriptStep[],
  ) {
    this.reset();
  }

  get history(): CoreMessage[] {
    return this.state.history;
  }

  get threadId(): string {
    return this.state.threadId;
  }

  get turn(): number {
    return this.currentTurn;
  }

  private reset(): void {
    this.state = new ScenarioExecutionState();
    this.state.setThreadId(this.config.threadId || generateThreadId());
    this.state.setAgents(this.config.agents);
    this.state.newTurn();
    this.currentTurn = 0;
  }

  async execute(): Promise<ScenarioResult> {
    this.reset();

    // Execute script steps - pass the execution context (this), not just state
    for (const scriptStep of this.steps) {
      const result = await scriptStep(this);
      if (result && typeof result === "object" && "success" in result) {
        return result as ScenarioResult;
      }
    }

    // If no conclusion reached, return max turns error
    return this.reachedMaxTurns([
      "Reached end of script without conclusion, add one of the following to the end of the script:",
      "- `Scenario.proceed()` to let the simulation continue to play out",
      "- `Scenario.judge()` to force criteria judgement",
      "- `Scenario.succeed()` or `Scenario.fail()` to end the test with an explicit result",
    ].join("\n"));
  }

  async step(): Promise<CoreMessage[] | ScenarioResult> {
    const result = await this._step();
    if (result === null) throw new Error("No result from step");

    return result;
  }

  private async _step(
    goToNextTurn: boolean = true,
    onTurn?: (executor: ScenarioExecution) => void | Promise<void>,
  ): Promise<CoreMessage[] | ScenarioResult | null> {
    if (this.state.pendingRolesOnTurn.length === 0) {
      if (!goToNextTurn) return null;

      this.state.newTurn();

      if (onTurn) await onTurn(this);

      if (this.currentTurn >= (this.config.maxTurns || 10))
        return this.reachedMaxTurns();
    }

    const currentRole = this.state.pendingRolesOnTurn[0];
    const { idx, agent: nextAgent } = this.nextAgentForRole(currentRole);
    if (!nextAgent) {
      this.state.pendingRolesOnTurn.pop();
      return this._step(goToNextTurn, onTurn);
    }

    this.state.pendingAgentsOnTurn.filter(agent => agent !== nextAgent);
    return await this.callAgent(idx, currentRole);
  }

  private async callAgent(
    idx: number,
    role: AgentRole,
    judgmentRequest: boolean = false,
  ): Promise<CoreMessage[] | ScenarioResult> {
    const agent = this.state.agents[idx];
    const startTime = Date.now();

    const agentInput: AgentInput = {
      threadId: this.state.threadId,
      messages: this.state.history,
      newMessages: this.state.getPendingMessages(idx),
      requestedRole: role,
      judgmentRequest: judgmentRequest,
      scenarioState: this.state,
      scenarioConfig: this.config,
    };

    try {
      const agentResponse = await agent.call(agentInput);
      const endTime = Date.now();

      this.state.addAgentTime(idx, endTime - startTime);
      this.state.clearPendingMessages(idx);

      if (typeof agentResponse === "object" && agentResponse && "success" in agentResponse) {
        return agentResponse as ScenarioResult;
      }

      const messages = convertAgentReturnTypesToMessages(
        agentResponse,
        role === AgentRole.USER ? "user" : "assistant"
      );

      this.state.addMessages(messages, idx);

      return messages;
    } catch (error) {
      return {
        success: false,
        messages: this.state.history,
        reasoning: `Agent error: ${error instanceof Error ? error.message : String(error)}`,
        passedCriteria: [],
        failedCriteria: this.getJudgeAgent()?.criteria ?? [],
        totalTime: this.state.totalTime,
        agentTime: Array.from(this.state.agentTimes.values()).reduce((sum, time) => sum + time, 0),
      };
    }
  }

  private nextAgentForRole(role: AgentRole): { idx: number; agent: AgentAdapter | null } {
    for (const agent of this.state.agents) {
      if (agent.role === role && this.state.pendingRolesOnTurn) {
        return { idx: this.state.agents.indexOf(agent), agent };
      }
    }
    return { idx: -1, agent: null };
  }

  private reachedMaxTurns(errorMessage?: string): ScenarioResult {
    const agentRoleAgentsIdx = this.state.agents
      .map((agent, i) => ({ agent, idx: i }))
      .filter(({ agent }) => agent.role === AgentRole.AGENT)
      .map(({ idx }) => idx);

    const agentTimes = agentRoleAgentsIdx
      .map(i => this.state.agentTimes.get(i) || 0);

    const totalAgentTime = agentTimes.reduce((sum, time) => sum + time, 0);

    return {
      success: false,
      messages: this.state.history,
      reasoning: errorMessage || `Reached maximum turns (${this.config.maxTurns || 10}) without conclusion`,
      passedCriteria: [],
      failedCriteria: this.getJudgeAgent()?.criteria ?? [],
      totalTime: this.state.totalTime,
      agentTime: totalAgentTime,
    };
  }

  async message(message: CoreMessage): Promise<void> {
    if (message.role === "user") {
      await this.scriptCallAgent(AgentRole.USER, message);
    } else if (message.role === "assistant") {
      await this.scriptCallAgent(AgentRole.AGENT, message);
    } else {
      this.state.addMessage(message);
    }
  }

  async user(content?: string | CoreMessage): Promise<void> {
    await this.scriptCallAgent(AgentRole.USER, content);
  }

  async agent(content?: string | CoreMessage): Promise<void> {
    await this.scriptCallAgent(AgentRole.AGENT, content);
  }

  async judge(content?: string | CoreMessage): Promise<ScenarioResult | null> {
    return await this.scriptCallAgent(AgentRole.JUDGE, content, true);
  }

  async proceed(
    turns?: number,
    onTurn?: (executor: ScenarioExecution) => void | Promise<void>,
    onStep?: (executor: ScenarioExecution) => void | Promise<void>,
  ): Promise<ScenarioResult | null> {
    let initialTurn = this.state.turn;

    while (true) {
      const goToNextTurn = turns === void 0 || initialTurn === null || this.currentTurn + 1 < initialTurn + turns;
      const nextMessage = await this._step(goToNextTurn, onTurn);

      if (initialTurn === null)
        initialTurn = this.currentTurn;

      if (nextMessage === null) {
        return null;
      }

      if (onStep) await onStep(this);

      if (nextMessage !== null && typeof nextMessage === "object")
        return nextMessage as ScenarioResult;
    }

  }

  async succeed(): Promise<ScenarioResult> {
    return {
      success: true,
      messages: this.state.history,
      reasoning: "Scenario marked as successful with Scenario.succeed()",
      passedCriteria: this.getJudgeAgent()?.criteria ?? [],
      failedCriteria: [],
    };
  }

  async fail(): Promise<ScenarioResult> {
    return {
      success: false,
      messages: this.state.history,
      reasoning: "Scenario marked as failed with Scenario.fail()",
      passedCriteria: [],
      failedCriteria: this.getJudgeAgent()?.criteria ?? [],
    };
  }

  private getJudgeAgent(): JudgeAgentAdapter | null {
    return this.state.agents.find(agent => agent instanceof JudgeAgentAdapter) ?? null;
  }

  private async scriptCallAgent(
    role: AgentRole,
    content?: string | CoreMessage,
    judgmentRequest: boolean = false,
  ): Promise<ScenarioResult | null> {
    let nextAgent = this.state.getNextAgentForRole(role);

    if (!nextAgent) {
      this.state.newTurn();
      nextAgent = this.state.getNextAgentForRole(role);

      if (!nextAgent) {
        const contentStr = typeof content === "string" ? content : content?.content || "";

        throw new Error(
          content
            ? `Cannot generate a message for role \`${role}\` with content \`${contentStr}\` because no agent with this role was found`
            : `Cannot generate a message for role \`${role}\` because no agent with this role was found`
        );
      }
    }

    this.state.removePendingAgent(nextAgent.agent);
    this.state.removePendingRole(role);

    if (content) {
      const message = typeof content === "string"
        ? { role: "user", content } as CoreMessage
        : content;

      this.state.addMessage(message);

      return null;
    }

    const result = await this.callAgent(nextAgent.index, role, judgmentRequest);
    if (Array.isArray(result))
      return null;

    return result;
  }
}
