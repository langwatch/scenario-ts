import { log } from "./utils/logger";
import {
  Message,
  AgentFunction,
  Criterion,
  ScenarioResult,
  ScenarioConfig,
  DEFAULT_CONFIG,
} from "./types";

/**
 * Represents a test scenario for evaluating agent behavior against defined criteria.
 *
 * A scenario consists of:
 * - A description that serves as the initial prompt
 * - Success criteria that determine when the scenario passes
 * - Failure criteria that determine when the scenario fails
 * - Configuration options for controlling execution
 */
export class Scenario {
  private successCriteria: Criterion[] = [];
  private failureCriteria: Criterion[] = [];
  private config: ScenarioConfig = DEFAULT_CONFIG;

  /**
   * Creates a new Scenario instance.
   *
   * @param description - The initial prompt or description for the scenario.
   *                     This sets up the context for the agent to work with.
   *
   * @throws {Error} If description is empty or only whitespace
   *
   * @example
   * ```typescript
   * const scenario = new Scenario("Generate a vegetarian recipe")
   *   .setConfig({ maxTurns: 5 })
   *   .addSuccessCriteria(["Must include ingredients"]);
   * ```
   */
  constructor(private readonly description: string) {
    if (!description?.trim()) {
      throw new Error("Scenario description is required and cannot be empty");
    }
  }

  /**
   * Updates the scenario's configuration.
   *
   * @param config - Partial configuration to merge with existing config
   * @returns The scenario instance for chaining
   *
   * @example
   * ```typescript
   * scenario.setConfig({ maxTurns: 5, debug: true });
   * ```
   */
  setConfig(config: Partial<ScenarioConfig>): this {
    this.config = { ...this.config, ...config };
    return this;
  }

  /**
   * Adds one or more success criteria to the scenario.
   *
   * @param criteria - String or function criteria that determine success
   * @returns This scenario instance for method chaining
   *
   * @example
   * ```typescript
   * // String criterion - checks if any message contains "4"
   * scenario.addSuccessCriteria("4");
   *
   * // Function criterion - custom evaluation logic
   * scenario.addSuccessCriteria((history) =>
   *   history.some(msg => msg.content.includes("The answer is 4"))
   * );
   * ```
   */
  addSuccessCriteria(criteria: Criterion | Criterion[]): Scenario {
    if (Array.isArray(criteria)) {
      this.successCriteria.push(...criteria);
    } else {
      this.successCriteria.push(criteria);
    }
    return this;
  }

  /**
   * Adds one or more failure criteria to the scenario.
   *
   * @param criteria - String or function criteria that determine failure
   * @returns This scenario instance for method chaining
   *
   * @example
   * ```typescript
   * // String criterion - fails if any message contains "5"
   * scenario.addFailureCriteria("5");
   *
   * // Function criterion - custom failure logic
   * scenario.addFailureCriteria((history) =>
   *   history.some(msg => msg.content.includes("I don't know"))
   * );
   * ```
   */
  addFailureCriteria(criteria: Criterion | Criterion[]): Scenario {
    if (Array.isArray(criteria)) {
      this.failureCriteria.push(...criteria);
    } else {
      this.failureCriteria.push(criteria);
    }
    return this;
  }

  /**
   * Runs the scenario with the given agent function.
   *
   * @param agent - Function that processes messages and returns responses
   * @returns A promise resolving to the scenario result
   * @throws May throw errors if the agent function throws
   *
   * @example
   * ```typescript
   * const result = await scenario.run(myAgentFunction);
   * console.log(`Success: ${result.success}, Turns: ${result.turns}`);
   * ```
   */
  async run(agent: AgentFunction): Promise<ScenarioResult> {
    const history: Message[] = [];
    let currentTurn = 0;
    let failureReason: string | undefined;

    // Ensure maxTurns is defined with a non-null assertion
    const maxTurns = this.config.maxTurns!;

    while (currentTurn < maxTurns) {
      // First turn uses description, subsequent turns use "Continue"
      const message = currentTurn === 0 ? this.description : "Continue";
      const response = await agent(message, history);

      // Add the exchange to history
      history.push({ role: "user", content: message });
      history.push(...response.messages);

      // Log if debug or verbose mode is enabled
      if (this.config.debug || this.config.verbose) {
        log(`Turn ${currentTurn + 1}:`, response);
      }

      // Check success criteria
      const success = this.evaluateCriteria(this.successCriteria, history);
      if (success) {
        return { success: true, history, turns: currentTurn + 1 };
      }

      // Check failure criteria
      const failure = this.evaluateCriteria(this.failureCriteria, history);
      if (failure) {
        failureReason = this.getFailureReason(history);
        return {
          success: false,
          history,
          turns: currentTurn + 1,
          failureReason,
        };
      }

      currentTurn++;
    }

    // If we reach here, we've hit the maximum turns without success
    return {
      success: false,
      history,
      turns: currentTurn,
      failureReason: "Maximum turns reached without meeting success criteria",
    };
  }

  /**
   * Evaluates a set of criteria against the message history.
   *
   * @param criteria - Array of criteria to evaluate
   * @param history - Message history to check against
   * @returns True if all criteria are met, false otherwise
   */
  private evaluateCriteria(criteria: Criterion[], history: Message[]): boolean {
    return criteria.every((criterion) => {
      if (typeof criterion === "string") {
        return history.some((msg) => msg.content.includes(criterion));
      }
      return criterion(history);
    });
  }

  /**
   * Determines the specific reason for scenario failure.
   *
   * @param history - Message history to check against
   * @returns A string describing the failure reason
   */
  private getFailureReason(history: Message[]): string {
    for (const criterion of this.failureCriteria) {
      if (typeof criterion === "string") {
        if (history.some((msg) => msg.content.includes(criterion))) {
          return `Failure criterion met: "${criterion}"`;
        }
      } else if (criterion(history)) {
        return "Custom failure criterion met";
      }
    }
    return "Unknown failure reason";
  }
}
