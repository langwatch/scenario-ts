import { randomUUID } from "crypto";
import { EMPTY, Subject } from "rxjs";
import { concatMap, catchError, finalize } from "rxjs/operators";
import { ConversationRunner } from "../conversation";
import { MaxTurnsExceededError } from "../conversation/errors";
import {
  ScenarioEventType,
  ScenarioRunStatus,
  type ScenarioEvent,
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
    // Set up event processing pipeline
    this.events$
      .pipe(
        // Process events in order
        concatMap((event) => this.postEvent(event)),
        // Handle errors without breaking the stream
        catchError((error) => {
          console.error("Error in event stream:", error);
          return EMPTY;
        }),
        finalize(() => {
          console.log("Event stream completed");
        })
      )
      .subscribe();
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

    // Set up event processing pipeline
    const finishedPromise = new Promise<void>((resolve, reject) => {
      this.events$
        .pipe(
          // Process events in order
          concatMap(async (event) => {
            await this.postEvent(event);
            return event;
          }),
          // Handle errors without breaking the stream
          catchError((error) => {
            console.error("Error in event stream:", error);
            return EMPTY;
          })
        )
        .subscribe({
          next: (event) => {
            console.log(`[${event.type}] Event stream completed`);
            if (event.type === ScenarioEventType.RUN_FINISHED) {
              resolve();
            }
          },
          error: (error) => {
            console.error("Error in event stream:", error);
            reject(error);
          },
        });
    });

    // Emit start event
    this.events$.next({
      type: ScenarioEventType.RUN_STARTED,
      scenarioId: this.scenarioId,
      scenarioRunId,
      timestamp: Date.now(),
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
      onMessages?.(messages);
    });

    runner.on("finish", (result) => {
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

      onFinish?.({
        ...result,
        ...this.config,
        ...testingAgent.getTestingAgentConfig(),
        forceFinishTestMessage,
      });
    });

    try {
      const result = await runner.run();

      if (process.env.VERBOSE === "true") {
        formatScenarioResult(result);
      }

      // Wait for the final event to be processed
      await finishedPromise;

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

  private async postEvent(event: ScenarioEvent) {
    console.log(`[${event.type}] Posting event`);
    const endpoint = process.env.SCENARIO_EVENTS_ENDPOINT;
    if (!endpoint) {
      console.warn(
        "No SCENARIO_EVENTS_ENDPOINT configured, skipping event posting"
      );
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(event),
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": process.env.LANGWATCH_API_KEY ?? "",
        },
      });

      // Log all response statuses for debugging
      console.log(
        `[${event.type}] Event POST response status: ${response.status}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`[${event.type}] Event POST response:`, data);
      } else {
        const errorText = await response.text();
        const error = new Error(`HTTP error ${response.status}: ${errorText}`);
        console.error(`[${event.type}] Event POST failed:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          event: event,
        });
        throw error;
      }
    } catch (error) {
      console.error(`[${event.type}] Event POST error:`, {
        error,
        event,
        endpoint,
      });
      throw error;
    }
  }
}
