import { Message, TestingAgent, TestingAgentResponse } from "./types";

interface ScenarioTestingAgentConfig {
  successCriteria?: string[];
  failureCriteria?: string[];
}

export class ScenarioTestingAgent implements TestingAgent {
  private systemPrompt!: string;

  constructor(private config: ScenarioTestingAgentConfig) {
    if (!config.successCriteria && !config.failureCriteria) {
      throw new Error("At least one success or failure criterion is required");
    }

    this.systemPrompt = this.buildSystemPrompt();
  }

  async invoke(
    message: string,
    history: Message[]
  ): Promise<TestingAgentResponse> {
    console.log(this.systemPrompt, message, history);
    throw new Error("Not implemented");
  }

  private buildSystemPrompt() {
    const { successCriteria, failureCriteria } = this.config;

    return `
    You are playing a role in a scenario where you have to interact with another agent.
    You are given a message and a history of messages.
    You need to determine if agent is successful or not based on the success and failure criteria.

    ${successCriteria && successCriteria.length > 0 ? `Success criteria:\n${successCriteria.map((c) => `- ${c}`).join("\n")}` : ""}
    ${failureCriteria && failureCriteria.length > 0 ? `Failure criteria:\n${failureCriteria.map((c) => `- ${c}`).join("\n")}` : ""}

    Return your response in the following structured json format:
    {
      "message": "The agent is successful or not",
      "criteria": [
        {
          "criterion": "The criterion that the agent is successful or not",
          "met": true,
          "reason": "The reason the agent is successful or not"
        }
      ]
    }
    `;
  }
}
