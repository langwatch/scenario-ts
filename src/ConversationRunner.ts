import {
  Message,
  TestableAgent,
  TestingAgent,
  TestingAgentResponse,
} from "./types";

export class ConversationRunner {
  private history: Message[] = [];

  constructor(
    private agent: TestableAgent,
    private testingAgent: TestingAgent
  ) {}

  async next(): Promise<TestingAgentResponse> {
    const response = await this.testingAgent.invoke(
      this.history[this.history.length - 1]?.content || "",
      this.history
    );

    if (!response.message) {
      return response;
    }

    const agentResponse = await this.agent.invoke(
      response.message,
      this.history
    );

    this.history.push(
      { role: "user", content: response.message },
      { role: "assistant", content: agentResponse }
    );

    return response;
  }

  getHistory(): Message[] {
    return [...this.history];
  }
}
