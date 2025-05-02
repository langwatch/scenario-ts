import { CoreMessage } from "ai";
import {
  ScenarioResult,
  TestableAgent,
  TestingAgent,
  TestingAgentResponseType,
} from "./types";
import {
  printTestableAgentMessage,
  printTestingAgentMessage,
} from "./utils/logger";

export class ConversationRunner {
  private messages: CoreMessage[] = [];

  constructor(
    private config: {
      agent: TestableAgent;
      testingAgent: TestingAgent;
      maxTurns: number;
      verbose?: boolean;
    }
  ) {}

  async run(): Promise<ScenarioResult> {
    const { agent, testingAgent, maxTurns } = this.config;
    const startTime = Date.now();

    while (this.messages.length < maxTurns) {
      const response = await testingAgent.invoke(this.messages);

      if (response.type === TestingAgentResponseType.FinishTest) {
        console.log("FINISH TEST");
        console.log(response);
        return response;
      }

      if (response.type === TestingAgentResponseType.Message) {
        if (this.config.verbose) {
          printTestingAgentMessage(response.message);
        }
        // Record testing agent's message as "user" since it's simulating a user
        this.messages.push({ role: "user", content: response.message });
        const { message } = await agent.invoke(response.message);
        this.messages.push({ role: "assistant", content: message });

        if (this.config.verbose) {
          printTestableAgentMessage(message);
        }
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

    const response = await testingAgent.invoke(this.messages);

    if (response.type === TestingAgentResponseType.FinishTest) {
      return response;
    }

    return {
      success: false,
      conversation: this.messages,
      reasoning: `Reached max turns (${maxTurns}) without a conclusion`,
      totalTime: Date.now() - startTime,
    };
  }
}
