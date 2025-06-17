/**
 * Example test for a simple agent that just echoes back the message.
 *
 * This example demonstrates testing a basic AI agent that just echoes back the message
 * using the `Scenario` and `TestableAgent` interfaces.
 */
import * as scenario from "@langwatch/scenario-ts";
import { describe, it, expect } from "vitest";

describe("Simple Example", () => {
  it("tests basic conversation flow", async () => {
    const agent: scenario.AgentAdapter = {
      role: scenario.AgentRole.AGENT,
      call: async (input) => {
        return {
          role: "assistant",
          content: `You said most recently: ${input.newMessages[0].content}`,
        };
      },
    };

    const result = await scenario.run({
      name: "A simple scenario to test the echo",
      description: "Test basic conversation flow",
      agents: [
        agent,
        scenario.judgeAgent({
          criteria: [
            "Agent responds to each message",
            "Agent's response includes the original message",
          ],
        }),
        scenario.userSimulatorAgent(),
      ],
      script: [
        scenario.user("Hello, how are you?"),
        scenario.agent(),
      ],
    });

    expect(result.success).toBe(true);
  });
});
