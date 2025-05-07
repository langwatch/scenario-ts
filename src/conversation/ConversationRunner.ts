import { CoreMessage } from "ai";
import {
  ScenarioResult,
  TestableAgent,
  TestingAgent,
  TestingAgentResponseFinishTest,
  TestingAgentResponseType,
  Verdict,
} from "../shared/types";
import { ConversationLogger } from "./ConversationLogger";

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
  private messages: CoreMessage[] = [];
  /** Logger */
  private _logger?: ConversationLogger;

  /**
   * Creates a new ConversationRunner instance
   *
   * @param config - Configuration options for the runner
   * @param config.agent - The agent being tested
   * @param config.testingAgent - The agent that simulates user behavior
   * @param config.maxTurns - Maximum number of conversation turns before ending
   * @param config.verbose - Whether to display detailed logging during execution
   * @param config.logger - The conversation logger
   */
  constructor(
    private config: {
      agent: TestableAgent;
      testingAgent: TestingAgent;
      maxTurns: number;
      verbose?: boolean;
      logger?: ConversationLogger;
    }
  ) {}

  /**
   * Executes the conversation between agents until completion or max turns
   *
   * @returns A ScenarioResult containing test outcome, conversation history, and timing data
   */
  async run(): Promise<ScenarioResult> {
    const { maxTurns } = this.config;
    const startTime = Date.now();

    while (this.messages.length < maxTurns) {
      const response = await this.getTestingAgentResponse();

      if (response.type === TestingAgentResponseType.FinishTest) {
        return response as TestingAgentResponseFinishTest;
      }

      if (response.type === TestingAgentResponseType.Message) {
        // Record testing agent's message as "user" since it's simulating a user
        this.messages.push({ role: "user", content: response.message });
        const { message } = await this.getAgentResponse(response.message);
        this.messages.push({ role: "assistant", content: message });
      }
    }

    this.messages.push({
      role: "assistant",
      content: `System:

<finish_test>
This is the last message, conversation has reached the maximum number of turns, give your final verdict,
if you don't have enough information to make a verdict, say inconclusive with max turns reached.
</finish_test>`,
    });

    const response = await this.getTestingAgentResponse();

    if (response.type === TestingAgentResponseType.FinishTest) {
      return response as TestingAgentResponseFinishTest;
    }

    return {
      type: "MAX_TURNS_EXCEEDED",
      verdict: Verdict.Failure,
      conversation: this.messages,
      reasoning: `Reached max turns (${maxTurns}) without a conclusion`,
      totalTime: Date.now() - startTime,
    };
  }

  /**
   * Gets a response from the testing agent
   *
   * @returns The testing agent's response (message or test conclusion)
   * @private
   */
  private async getTestingAgentResponse() {
    const { testingAgent, verbose } = this.config;

    if (verbose) {
      this.logger.startUserSpinner();
      const response = await testingAgent.invoke(this.messages);
      this.logger.stopUserSpinner();
      if (response.type === TestingAgentResponseType.Message) {
        this.logger.printUserMessage(response.message);
      }
      return response;
    }

    return await testingAgent.invoke(this.messages);
  }

  /**
   * Gets a response from the agent being tested
   *
   * @param input - The message to send to the agent
   * @returns The agent's response message
   * @private
   */
  private async getAgentResponse(input: string) {
    const { agent, verbose } = this.config;

    if (verbose) {
      this.logger.startAgentSpinner();
      const { message } = await agent.invoke(input);
      this.logger.stopAgentSpinner();
      this.logger.printAgentMessage(message);
      return { message };
    }

    return await agent.invoke(input);
  }

  private get logger() {
    if (this.config.logger) {
      return this.config.logger;
    }

    return (this._logger ??= new ConversationLogger());
  }
}
