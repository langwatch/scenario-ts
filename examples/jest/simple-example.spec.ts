import { Scenario, TestingAgentImpl, TestableAgent } from "../../src";

// A simple agent that just echoes back the message
class EchoAgent implements TestableAgent {
  async invoke(message: string): Promise<string> {
    return `You said: ${message}`;
  }
}

describe("Simple Example", () => {
  it("tests basic conversation flow", async () => {
    // Create a simple scenario
    const scenario = new Scenario({
      successCriteria: [
        "Agent responds to each message",
        "Agent's response includes the original message",
      ],
      failureCriteria: ["Agent fails to respond", "Agent's response is empty"],
    });

    // Create our test subject
    const agent = new EchoAgent();

    // Run the test
    const result = await scenario.run(agent);

    // Check the results
    expect(result.success).toBe(true);
    expect(result.history.length).toBeGreaterThan(0);
    expect(result.history[0].role).toBe("user");
    expect(result.history[1].role).toBe("assistant");
  });

  it("tests with a custom testing agent", async () => {
    const scenario = new Scenario({
      success: [
        "Agent responds appropriately to questions",
        "Agent maintains conversation context",
      ],
      failure: ["Agent ignores questions", "Agent loses context"],
    });

    // A more specific testing agent
    const questioner = TestingAgentImpl.builder()
      .withPersona("curious user")
      .withFocus("asking questions")
      .withInstruction("Ask follow-up questions")
      .withInstruction("Reference previous answers")
      .build();

    const result = await scenario.run(new EchoAgent(), questioner);
    expect(result.success).toBe(true);
  });
});
