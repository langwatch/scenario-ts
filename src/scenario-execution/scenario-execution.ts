import { CoreMessage } from "ai";
import { Subject, Observable } from "rxjs";
import { ScenarioExecutionState } from "./scenario-execution-state";
import {
  type ScenarioResult,
  type ScenarioConfig,
  AgentRole,
  type AgentInput,
  type ScriptStep,
  type AgentReturnTypes,
  type ScenarioExecutionLike,
  type AgentAdapter,
  JudgeAgentAdapter,
  ScenarioExecutionStateLike,
} from "../domain";
import {
  ScenarioEvent,
  ScenarioEventType,
  ScenarioRunStatus,
  ScenarioRunStartedEvent,
  ScenarioRunFinishedEvent,
  ScenarioMessageSnapshotEvent,
} from "../scenario-events";
import {
  generateThreadId,
  getBatchRunId,
  generateScenarioId,
  generateScenarioRunId,
} from "../utils/ids";

/**
 * Converts agent response types to standardized CoreMessage array format.
 * Handles string responses, arrays, and objects with role properties.
 */
function convertAgentReturnTypesToMessages(
  response: AgentReturnTypes,
  role: "user" | "assistant"
): CoreMessage[] {
  if (typeof response === "string")
    return [{ role, content: response } as CoreMessage];

  if (Array.isArray(response)) return response;

  if (typeof response === "object" && "role" in response) return [response];

  return [];
}

/**
 * Manages the execution of a scenario with agents, handling state, events, and script steps.
 * Provides both programmatic control and event streaming capabilities.
 */
export class ScenarioExecution implements ScenarioExecutionLike {
  private state: ScenarioExecutionStateLike = new ScenarioExecutionState();
  private currentTurn: number = 0;
  private eventSubject = new Subject<ScenarioEvent>();
  public readonly events$: Observable<ScenarioEvent> =
    this.eventSubject.asObservable();

  constructor(
    public readonly config: ScenarioConfig,
    public readonly steps: ScriptStep[]
  ) {
    this.config.id = this.config.id || generateScenarioId();
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

  /**
   * Executes the complete scenario, running all script steps and emitting events.
   * Returns the final scenario result with success status and metrics.
   */
  async execute(): Promise<ScenarioResult> {
    this.reset();

    const scenarioRunId = generateScenarioRunId();
    this.emitRunStarted({
      scenarioRunId,
    });

    try {
      for (const scriptStep of this.steps) {
        const result = await scriptStep(this);

        this.emitMessageSnapshot({ scenarioRunId });

        if (result && typeof result === "object" && "success" in result) {
          const status = result.success
            ? ScenarioRunStatus.SUCCESS
            : ScenarioRunStatus.FAILED;
          this.emitRunFinished({ scenarioRunId, status });
          return result as ScenarioResult;
        }
      }

      // If no conclusion reached, return max turns error
      const errorResult = this.reachedMaxTurns(
        [
          "Reached end of script without conclusion, add one of the following to the end of the script:",
          "- `Scenario.proceed()` to let the simulation continue to play out",
          "- `Scenario.judge()` to force criteria judgement",
          "- `Scenario.succeed()` or `Scenario.fail()` to end the test with an explicit result",
        ].join("\n")
      );

      this.emitRunFinished({ scenarioRunId, status: ScenarioRunStatus.FAILED });

      return errorResult;
    } catch (error) {
      this.emitRunFinished({
        scenarioRunId,
        status: ScenarioRunStatus.ERROR,
      });
      throw error;
    }
  }

  /**
   * Executes a single step in the scenario execution.
   * Returns either new messages or a final scenario result.
   */
  async step(): Promise<CoreMessage[] | ScenarioResult> {
    const result = await this._step();
    if (result === null) throw new Error("No result from step");

    return result;
  }

  /**
   * Adds a message to the conversation history.
   * Routes user/assistant messages through appropriate agents.
   */
  async message(message: CoreMessage): Promise<void> {
    if (message.role === "user") {
      await this.scriptCallAgent(AgentRole.USER, message);
    } else if (message.role === "assistant") {
      await this.scriptCallAgent(AgentRole.AGENT, message);
    } else {
      this.state.addMessage(message);
    }
  }

  /**
   * Generates a user message, either with provided content or by calling a user agent.
   */
  async user(content?: string | CoreMessage): Promise<void> {
    await this.scriptCallAgent(AgentRole.USER, content);
  }

  /**
   * Generates an agent message, either with provided content or by calling an agent.
   */
  async agent(content?: string | CoreMessage): Promise<void> {
    await this.scriptCallAgent(AgentRole.AGENT, content);
  }

  /**
   * Invokes a judge agent to evaluate the scenario against criteria.
   * Returns a scenario result if judgment is conclusive.
   */
  async judge(content?: string | CoreMessage): Promise<ScenarioResult | null> {
    return await this.scriptCallAgent(AgentRole.JUDGE, content, true);
  }

  /**
   * Continues scenario execution for a specified number of turns.
   * Provides hooks for turn and step-level callbacks.
   */
  async proceed(
    turns?: number,
    onTurn?: (executor: ScenarioExecution) => void | Promise<void>,
    onStep?: (executor: ScenarioExecution) => void | Promise<void>
  ): Promise<ScenarioResult | null> {
    let initialTurn = this.state.turn;

    while (true) {
      const goToNextTurn =
        turns === void 0 ||
        initialTurn === null ||
        this.currentTurn + 1 < initialTurn + turns;
      const nextMessage = await this._step(goToNextTurn, onTurn);

      if (initialTurn === null) initialTurn = this.currentTurn;

      if (nextMessage === null) {
        return null;
      }

      if (onStep) await onStep(this);

      if (nextMessage !== null && typeof nextMessage === "object")
        return nextMessage as ScenarioResult;
    }
  }

  /**
   * Marks the scenario as successful and returns a success result.
   */
  async succeed(): Promise<ScenarioResult> {
    return {
      success: true,
      messages: this.state.history,
      reasoning: "Scenario marked as successful with Scenario.succeed()",
      passedCriteria: this.getJudgeAgent()?.criteria ?? [],
      failedCriteria: [],
    };
  }

  /**
   * Marks the scenario as failed and returns a failure result.
   */
  async fail(): Promise<ScenarioResult> {
    return {
      success: false,
      messages: this.state.history,
      reasoning: "Scenario marked as failed with Scenario.fail()",
      passedCriteria: [],
      failedCriteria: this.getJudgeAgent()?.criteria ?? [],
    };
  }

  /**
   * Resets the execution state to initial conditions.
   * Initializes thread ID, agents, and turn counter.
   */
  private reset(): void {
    this.state = new ScenarioExecutionState();
    this.state.setThreadId(this.config.threadId || generateThreadId());
    this.state.setAgents(this.config.agents);
    this.state.newTurn();
    this.currentTurn = 0;
  }

  /**
   * Internal step execution with optional turn advancement and callbacks.
   * Returns messages, scenario result, or null if no action taken.
   */
  private async _step(
    goToNextTurn: boolean = true,
    onTurn?: (executor: ScenarioExecution) => void | Promise<void>
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

    this.state.pendingAgentsOnTurn.filter((agent) => agent !== nextAgent);
    return await this.callAgent(idx, currentRole);
  }

  /**
   * Invokes a specific agent with the current scenario context.
   * Handles timing, error recovery, and result processing.
   */
  private async callAgent(
    idx: number,
    role: AgentRole,
    judgmentRequest: boolean = false
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

      if (
        typeof agentResponse === "object" &&
        agentResponse &&
        "success" in agentResponse
      ) {
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
        reasoning: `Agent error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        passedCriteria: [],
        failedCriteria: this.getJudgeAgent()?.criteria ?? [],
        totalTime: this.state.totalTime,
        agentTime: Array.from(this.state.agentTimes.values()).reduce(
          (sum, time) => sum + time,
          0
        ),
      };
    }
  }

  /**
   * Finds the next available agent for a specific role.
   * Returns agent index and reference, or null if none found.
   */
  private nextAgentForRole(role: AgentRole): {
    idx: number;
    agent: AgentAdapter | null;
  } {
    for (const agent of this.state.agents) {
      if (agent.role === role && this.state.pendingRolesOnTurn) {
        return { idx: this.state.agents.indexOf(agent), agent };
      }
    }
    return { idx: -1, agent: null };
  }

  /**
   * Creates a failure result when maximum turns are reached.
   * Calculates timing metrics and provides appropriate error messaging.
   */
  private reachedMaxTurns(errorMessage?: string): ScenarioResult {
    const agentRoleAgentsIdx = this.state.agents
      .map((agent, i) => ({ agent, idx: i }))
      .filter(({ agent }) => agent.role === AgentRole.AGENT)
      .map(({ idx }) => idx);

    const agentTimes = agentRoleAgentsIdx.map(
      (i) => this.state.agentTimes.get(i) || 0
    );

    const totalAgentTime = agentTimes.reduce((sum, time) => sum + time, 0);

    return {
      success: false,
      messages: this.state.history,
      reasoning:
        errorMessage ||
        `Reached maximum turns (${
          this.config.maxTurns || 10
        }) without conclusion`,
      passedCriteria: [],
      failedCriteria: this.getJudgeAgent()?.criteria ?? [],
      totalTime: this.state.totalTime,
      agentTime: totalAgentTime,
    };
  }

  /**
   * Retrieves the judge agent from the current agent list.
   * Returns null if no judge agent is configured.
   */
  private getJudgeAgent(): JudgeAgentAdapter | null {
    return (
      this.state.agents.find((agent) => agent instanceof JudgeAgentAdapter) ??
      null
    );
  }

  /**
   * Internal method for script-driven agent invocation.
   * Handles role-based agent selection and optional content injection.
   */
  private async scriptCallAgent(
    role: AgentRole,
    content?: string | CoreMessage,
    judgmentRequest: boolean = false
  ): Promise<ScenarioResult | null> {
    let nextAgent = this.state.getNextAgentForRole(role);

    if (!nextAgent) {
      this.state.newTurn();
      nextAgent = this.state.getNextAgentForRole(role);

      if (!nextAgent) {
        const contentStr =
          typeof content === "string" ? content : content?.content || "";

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
      const message =
        typeof content === "string"
          ? ({ role: "user", content } as CoreMessage)
          : content;

      this.state.addMessage(message);

      return null;
    }

    const result = await this.callAgent(nextAgent.index, role, judgmentRequest);
    if (Array.isArray(result)) return null;

    return result;
  }

  // =====================================================
  // Event Emission Methods
  // =====================================================
  // These methods handle the creation and emission of
  // scenario events for external consumption and monitoring
  // =====================================================

  /**
   * Emits an event to the event stream for external consumption.
   */
  private emitEvent(event: ScenarioEvent): void {
    this.eventSubject.next(event);
  }

  /**
   * Creates base event properties shared across all scenario events.
   */
  private makeBaseEvent({ scenarioRunId }: { scenarioRunId: string }) {
    // Assumes these IDs are present in config (add validation as needed)
    return {
      batchRunId: getBatchRunId(),
      scenarioId: this.config.id!,
      scenarioRunId,
      timestamp: Date.now(),
      rawEvent: undefined,
    };
  }

  /**
   * Emits a run started event to indicate scenario execution has begun.
   */
  private emitRunStarted({ scenarioRunId }: { scenarioRunId: string }) {
    this.emitEvent({
      ...this.makeBaseEvent({ scenarioRunId }),
      type: ScenarioEventType.RUN_STARTED,
      metadata: {
        name: this.config.name,
        description: this.config.description,
      },
    } as ScenarioRunStartedEvent);
  }

  /**
   * Emits a message snapshot event containing current conversation history.
   */
  private emitMessageSnapshot({ scenarioRunId }: { scenarioRunId: string }) {
    this.emitEvent({
      ...this.makeBaseEvent({ scenarioRunId }),
      type: ScenarioEventType.MESSAGE_SNAPSHOT,
      messages: this.state.history,
      // Add any other required fields from MessagesSnapshotEventSchema
    } as ScenarioMessageSnapshotEvent);
  }

  /**
   * Emits a run finished event with the final execution status.
   */
  private emitRunFinished({
    scenarioRunId,
    status,
  }: {
    scenarioRunId: string;
    status: ScenarioRunStatus;
  }) {
    this.emitEvent({
      ...this.makeBaseEvent({ scenarioRunId }),
      type: ScenarioEventType.RUN_FINISHED,
      status,
      // Add error/metrics fields if needed
    } as ScenarioRunFinishedEvent);
  }
}
