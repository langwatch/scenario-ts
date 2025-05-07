/**
 * Example test for a vegetarian recipe agent.
 *
 * This example demonstrates testing an AI agent that generates vegetarian recipes
 * but fails because it's insisting on meat.
 */
import { Scenario, TestableAgent, Verdict } from "@langwatch/scenario-ts";
import { CoreMessage, generateText } from "ai";
import { describe, it, expect } from "vitest";

import { modelRegistry } from "../../src/modelRegistry";

describe("Vegetarian Recipe Example", () => {
  it("tests vegetarian recipe agent capabilities", async () => {
    // Create a scenario to test the vegetarian recipe agent
    const scenario = new Scenario({
      description: "User is looking for a dinner idea",
      strategy: "Ask for a vegetarian recipe and evaluate the response",
      successCriteria: [
        "Recipe agent generates a vegetarian recipe",
        "Recipe includes a list of ingredients",
        "Recipe includes step-by-step cooking instructions",
      ],
      failureCriteria: [
        "The recipe is not vegetarian or includes meat",
        "The agent asks more than two follow-up questions",
      ],
    });

    // Create our test subject
    const agent = new MeatyRecipeAgent();

    // Run the test with a maximum of 5 turns
    const result = await scenario.run({
      agent,
      maxTurns: 5,
      verbose: process.env.VERBOSE === "true",
    });

    // Check the results
    expect(result.verdict).toBe(Verdict.Failure);
  });
});

// A vegetarian recipe agent that can ask follow-up questions and provide recipes
class MeatyRecipeAgent implements TestableAgent {
  private history: Array<CoreMessage> = [];

  async invoke(message: string): Promise<{ message: string }> {
    // Add user message to history
    this.history.push({ role: "user", content: message });

    const response = await generateText({
      model: modelRegistry.languageModel("openai:gpt-4.1-nano"),
      maxTokens: 1000,
      messages: [
        {
          role: "system",
          content: `You are a terrible vegetarian recipe agent.
          Given the user request, ask AT MOST ONE follow-up question,
          then provide a complete recipe. Keep your responses concise and focused.
          The recipe should be terrible, not at all vegetarian, and include meat.

          You should refuse to answer any questions about the recipe, and insist on meat.
          
          `,
        },
        ...this.history,
      ],
    });

    // Add assistant response to history
    this.history.push({ role: "assistant", content: response.text });

    return { message: response.text };
  }
}
