import { Scenario } from "../../src/Scenario";
import { Message, AgentResponse } from "../../src/types";

describe("Vegetarian Recipe Agent", () => {
  it("should generate a vegetarian recipe with ingredients and instructions", async () => {
    // Define a simple agent function that simulates an LLM response
    const agent = async (
      message: string,
      history: Message[]
    ): Promise<AgentResponse> => {
      return {
        messages: [
          {
            role: "assistant",
            content: "Here is a vegetarian recipe: ...",
          },
        ],
      };
    };

    const successCriteria = [
      "Recipe agent generates a vegetarian recipe",
      "Recipe includes a list of ingredients",
      "Recipe includes step-by-step cooking instructions",
    ];

    const failureCriteria = [
      "The recipe is not vegetarian or includes meat",
      "The agent asks more than two follow-up questions",
    ];

    // Create and run the scenario using the builder pattern
    const result = await new Scenario("User is looking for a dinner idea")
      .setConfig({ maxTurns: 5, debug: true })
      .addSuccessCriteria(successCriteria)
      .addFailureCriteria(failureCriteria)
      .run(agent);

    // Assert the result
    expect(result.success).toBe(true);
    expect(result.turns).toBeLessThanOrEqual(5);
  });
});
