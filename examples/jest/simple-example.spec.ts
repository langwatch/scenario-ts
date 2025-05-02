import { Scenario, TestableAgent } from "../../src";

// A simple agent that just echoes back the message
class EchoAgent implements TestableAgent {
  async invoke(message: string): Promise<{ message: string }> {
    return { message: `You said: ${message}` };
  }
}

describe("Simple Example", () => {
  it("tests basic conversation flow", async () => {
    // Create a simple scenario
    const scenario = new Scenario({
      description: "Test basic conversation flow",
      strategy: "Test basic conversation flow",
      successCriteria: [
        "Agent responds to each message",
        "Agent's response includes the original message",
      ],
      failureCriteria: ["Agent fails to respond", "Agent's response is empty"],
    });

    // Create our test subject
    const agent = new EchoAgent();

    // Run the test
    const result = await scenario.run({ agent });

    // Check the results
    try {
      expect(result.success).toBe(true);
    } catch (error) {
      console.log(result);
      throw error;
    }
  });
});
