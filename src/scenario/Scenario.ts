import { ConversationRunner } from "../conversation";
import { MaxTurnsExceededError } from "../conversation/errors";
import {
  type ScenarioConfig,
  type ScenarioResult,
  type RunOptions,
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

  /**
   * Creates a new scenario with the specified configuration.
   *
   * @param config - The configuration that defines the scenario's behavior,
   *                 including description, strategy, and success/failure criteria
   */
  constructor(public readonly config: ScenarioConfig) {}

  /**
   * Gets the testing agent instance, creating it if it doesn't exist yet.
   * Uses lazy initialization to avoid creating the agent until needed.
   *
   * @returns The ScenarioTestingAgent instance for this scenario
   */
  private get scenarioTestingAgent(): ScenarioTestingAgent {
    return (this._scenarioTestingAgent ??= new ScenarioTestingAgent(
      this.config
    ));
  }

  /**
   * Runs the scenario with the provided agent and options.
   *
   * @param options - Configuration for this specific run:
   *   - agent: The testable agent to evaluate
   *   - maxTurns: Maximum conversation turns before ending (defaults to 2)
   *   - verbose: Whether to log detailed information during the run (defaults to false)
   *
   * @returns A ScenarioResult containing the outcome of the test, including
   *          success/failure status, conversation history, and reasoning
   */
  public async run({
    agent,
    maxTurns = 2,
  }: RunOptions): Promise<ScenarioResult> {
    const testingAgent = this.scenarioTestingAgent;

    const runner = new ConversationRunner({
      agent,
      testingAgent,
      maxTurns,
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
    }
  }
}
