import { randomUUID } from "crypto";
import { Subject } from "rxjs";
import { ConversationRunner } from "../conversation";
import { MaxTurnsExceededError } from "../conversation/errors";
import {
  ScenarioEventType,
  ScenarioRunStatus,
  type ScenarioEvent,
  type ScenarioRunStartedEvent,
  type ScenarioRunFinishedEvent,
  type ScenarioMessageSnapshotEvent,
} from "../schemas";
import {
  type ScenarioConfig,
  type ScenarioResult,
  type RunOptions,
  Verdict,
} from "../shared/types";
import { formatScenarioResult } from "../shared/utils/logging";
import { ScenarioTestingAgent } from "../testing-agent";

/**
 * Represents a test scenario for evaluating AI agent behavior.
 *
 * This class encapsulates the configuration and execution of a test scenario,
 * providing a way to run conversations between a testable agent and a testing agent
 * that simulates user behavior according to a defined strategy.
 */
export class Scenario {
  /** Lazily initialized testing agent instance */
  private _scenarioTestingAgent!: ScenarioTestingAgent;
  private events$ = new Subject<ScenarioEvent>();
  private scenarioId = "scenario-" + randomUUID();

  /**
   * Creates a new scenario with the specified configuration.
   *
   * @param config - The configuration that defines the scenario's behavior,
   *                 including description, strategy, and success/failure criteria
   */
  constructor(public readonly config: ScenarioConfig) {
    this.handleEvents();
  }

  /**
   * Gets the testing agent instance, creating it if it doesn't exist yet.
   * Uses lazy initialization to avoid creating the agent until needed.
   *
   * @returns The ScenarioTestingAgent instance for this scenario
   */
  get scenarioTestingAgent(): ScenarioTestingAgent {
    return (this._scenarioTestingAgent ??= new ScenarioTestingAgent(
      this.config
    ));
  }

  public setScenarioTestingAgent(agent: ScenarioTestingAgent): Scenario {
    this._scenarioTestingAgent = agent;
    return this;
  }

  /**
   * Runs the scenario with the provided agent and options.
   *
   * @param options - Configuration for this specific run:
   *   - agent: The testable agent to evaluate
   *   - maxTurns: Maximum conversation turns before ending (defaults to 2)
   *
   * @returns A ScenarioResult containing the outcome of the test, including
   *          success/failure status, conversation history, and reasoning
   */
  public async run({
    agent,
    maxTurns = 2,
    onMessages,
    onFinish,
  }: RunOptions): Promise<ScenarioResult> {
    const scenarioRunId = "scenario-run-" + randomUUID();
    const runStartedEvent: ScenarioRunStartedEvent = {
      type: ScenarioEventType.RUN_STARTED,
      scenarioId: this.scenarioId,
      scenarioRunId,
      timestamp: Date.now(),
    };
    this.events$.next(runStartedEvent);

    const testingAgent = this.scenarioTestingAgent;

    const forceFinishTestMessage = `System:
<finish_test>
This is the last message, conversation has reached the maximum number of turns, give your final verdict,
if you don't have enough information to make a verdict, say inconclusive with max turns reached.
</finish_test>`;

    const runner = new ConversationRunner({
      agent,
      testingAgent,
      maxTurns,
      forceFinishTestMessage,
    });

    runner.on("messages", (messages) => {
      console.log("messages", messages);
      onMessages?.(messages);

      const messageSnapshotEvent: ScenarioMessageSnapshotEvent = {
        type: ScenarioEventType.MESSAGE_SNAPSHOT,
        scenarioId: this.scenarioId,
        scenarioRunId,
        messages: messages.map((message) => ({
          id: randomUUID(),
          role: message.role as "user" | "assistant",
          content: message.content as string,
        })),
        timestamp: Date.now(),
      };
      this.events$.next(messageSnapshotEvent);
    });

    runner.on("finish", (result) => {
      console.log("finish", result);
      onFinish?.({
        ...result,
        ...this.config,
        ...testingAgent.getTestingAgentConfig(),
        forceFinishTestMessage,
      });

      const runFinishedEvent: ScenarioRunFinishedEvent = {
        type: ScenarioEventType.RUN_FINISHED,
        scenarioId: this.scenarioId,
        scenarioRunId,
        status:
          result.verdict === Verdict.Success
            ? ScenarioRunStatus.SUCCESS
            : ScenarioRunStatus.FAILED,
        timestamp: Date.now(),
      };
      this.events$.next(runFinishedEvent);
    });

    try {
      const result = await runner.run();

      if (process.env.VERBOSE === "true") {
        formatScenarioResult(result);
      }

      return result;
    } catch (error) {
      if (error instanceof MaxTurnsExceededError) {
        if (process.env.VERBOSE === "true") {
          console.log(
            "Max turns exceeded. Conversation history:",
            runner.messages
          );
        }

        throw error;
      }

      throw error;
    } finally {
      this.events$.complete();
    }
  }

  private handleEvents() {
    this.events$.subscribe(async (event) => {
      console.log("event", event);
      this.postEvent(event).catch((error) => {
        console.error("Error posting event", error);
      });
    });
  }

  private async postEvent(event: ScenarioEvent) {
    const endpoint = process.env.SCENARIO_EVENTS_ENDPOINT;
    if (endpoint) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: JSON.stringify(event),
          headers: {
            "Content-Type": "application/json",
            "X-Auth-Token": process.env.LANGWATCH_API_KEY ?? "",
          },
        });
        console.log("response status", response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("response", data);
        } else {
          const errorText = await response.text();
          console.error("Error response:", errorText);
          throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }
      } catch (error) {
        console.error("Error posting event", error);
        throw error;
      }
    }
    return;
  }
}
