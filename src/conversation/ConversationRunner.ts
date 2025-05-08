import { CoreMessage } from "ai";

import { ConversationLogger } from "./ConversationLogger";
import { MaxTurnsExceededError } from "./errors";
import type {
  ScenarioResult,
  TestableAgent,
  TestingAgent,
  TestingAgentResponse,
} from "../shared/types";
/**
 * ConversationRunner - Manages the conversation flow between a testable agent and a testing agent
 *
 * This class handles the back-and-forth interaction between agents, tracks messages,
 * and determines when a test scenario should conclude. It supports:
 * 1. Running conversations up to a maximum number of turns
 * 2. Handling different types of testing agent responses
 * 3. Collecting conversation history for result analysis
 * 4. Measuring total conversation time
 * 5. Providing visual feedback in verbose mode
 */
export class ConversationRunner {
  /** Stores the conversation history between agents */
  readonly messages: CoreMessage[] = [];
  /** Logger */
  private logger = new ConversationLogger();

  /**
   * Creates a new ConversationRunner instance
   *
   * @param config - Configuration options for the runner
   * @param config.agent - The agent being tested
   * @param config.testingAgent - The agent that simulates user behavior
   * @param config.maxTurns - Maximum number of conversation turns before ending
   * @param config.verbose - Whether to display detailed logging during execution
   */
  constructor(
    private config: {
      agent: TestableAgent;
      testingAgent: TestingAgent;
      maxTurns: number;
    }
  ) {}

  /**
   * Executes the conversation between agents until completion or max turns
   *
   * @returns A ScenarioResult containing test outcome, conversation history, and timing data
   */
  async run(): Promise<ScenarioResult> {
    const { maxTurns } = this.config;
    // Result of the test
    let result: ScenarioResult | undefined;

    while (this.messages.length < maxTurns) {
      //--------------------------------
      // Get the testing agent's response
      //--------------------------------
      const response = await this.withUserSpinner(async () => {
        return await this.config.testingAgent.invoke(this.messages, {
          onFinishTest: (response) => {
            result = response;
          },
        });
      });

      // Record testing agent's message as "user" since it's simulating a user
      this.messages.push({ role: "user", content: response.text });

      // If we get a test result,
      // exit the loop and return the result
      if (result) {
        return result;
      }

      //--------------------------------
      // Get the agent's response
      //--------------------------------
      const { text } = await this.withAgentSpinner(async () => {
        return await this.config.agent.invoke(response.text);
      });

      // Record the agent's message
      this.messages.push({ role: "assistant", content: text });
    }

    // If we get here, we've hit max turns
    // We need to give the testing agent a chance to make a final verdict
    this.messages.push({
      role: "assistant",
      content: `System:
<finish_test>
This is the last message, conversation has reached the maximum number of turns, give your final verdict,
if you don't have enough information to make a verdict, say inconclusive with max turns reached.
</finish_test>`,
    });

    // One final attempt to get a test result
    await this.withUserSpinner(async () => {
      return await this.config.testingAgent.invoke(this.messages, {
        onFinishTest: (response) => {
          result = response;
        },
      });
    });

    if (result) {
      return result;
    }

    throw new MaxTurnsExceededError("Max turns exceeded");
  }

  private async withUserSpinner<T extends TestingAgentResponse>(fn: () => Promise<T>): Promise<T> {
    if (process.env.VERBOSE === "true") {
      this.logger.startUserSpinner();
      const result = await fn();
      this.logger.stopUserSpinner();
      this.logger.printUserMessage(result.text);
      return result;
    }

    return fn();
  }

  private async withAgentSpinner<T extends TestingAgentResponse>(fn: () => Promise<T>): Promise<T> {
    if (process.env.VERBOSE === "true") {
      this.logger.startAgentSpinner();
      const result = await fn();
      this.logger.stopAgentSpinner();
      this.logger.printAgentMessage(result.text);
      return result;
    }

    return fn();
  }
}
