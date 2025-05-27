import { randomUUID } from "crypto";
import {
  BaseEvent,
  EventType,
  CustomEvent,
  MessagesSnapshotEvent,
} from "@ag-ui/core";
import { Subject } from "rxjs";
import { ConversationRunner } from "../conversation";
import { MaxTurnsExceededError } from "../conversation/errors";
import {
  type ScenarioConfig,
  type ScenarioResult,
  type RunOptions,
  Verdict,
} from "../shared/types";
import { formatScenarioResult } from "../shared/utils/logging";
import { ScenarioTestingAgent } from "../testing-agent";

enum ScenarioEvents {
  SCENARIO_STARTED = "SCENARIO_STARTED",
  SCENARIO_FINISHED = "SCENARIO_FINISHED",
}

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
  private events$ = new Subject<
    BaseEvent | CustomEvent | MessagesSnapshotEvent
  >();

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
    this.events$.next({
      type: EventType.CUSTOM,
      name: ScenarioEvents.SCENARIO_STARTED,
    });

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
      if (onMessages) {
        onMessages(messages);
      }

      this.events$.next({
        type: EventType.MESSAGES_SNAPSHOT,
        messages: messages.map((message) => ({
          id: randomUUID(),
          role: message.role as "user" | "assistant",
          content: message.content as string,
        })),
      });
    });

    runner.on("finish", (result) => {
      if (onFinish) {
        onFinish({
          ...result,
          ...this.config,
          ...testingAgent.getTestingAgentConfig(),
          forceFinishTestMessage,
        });
      }

      this.events$.next({
        type: EventType.CUSTOM,
        name: ScenarioEvents.SCENARIO_FINISHED,
        value: {
          success: result.verdict === Verdict.Success,
        },
      });
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
    this.events$.subscribe((event) => {
      const endpoint = process.env.AGUI_EVENTS_ENDPOINT;
      if (endpoint) {
        return fetch(endpoint, {
          method: "POST",
          body: JSON.stringify(event),
        });
      } else {
        return;
      }
    });
  }
}
