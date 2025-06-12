/**
 * Example test for a simple agent that just echoes back the message.
 *
 * This example demonstrates testing a basic AI agent that just echoes back the message
 * using the `Scenario` and `TestableAgent` interfaces.
 */
import { AgentInput, AgentReturnTypes, Scenario, ScenarioAgentAdapter, ScenarioAgentRole, TestingAgent } from "@langwatch/scenario-ts";
import { describe, it, expect } from "vitest";
import { modelRegistry } from "../../src/model-registry";

// A simple agent that just echoes back the message
class EchoAgent implements ScenarioAgentAdapter {
  roles: ScenarioAgentRole[];

  async call(input: AgentInput): Promise<AgentReturnTypes> {
    return `You said most recently: ${input.newMessages[0].content}`;
  }
}

describe("Simple Example", () => {
  it("tests basic conversation flow", async () => {
    const scenario = new Scenario({
      name: "A simple scenario to test the echo",
      agent: new EchoAgent(),
      testingAgent: new TestingAgent({
        model: modelRegistry.languageModel("openai:gpt-4.1-nano"),
      }),
      description: "Test basic conversation flow",
      criteria: [
        "Agent responds to each message",
        "Agent's response includes the original message",
      ],
    });

    const result = await scenario.run();

    expect(result.success).toBe(true);
    if (!result.success) {
      console.log(result.messages);
    }
  });
});
