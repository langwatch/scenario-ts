/**
 * Example test for a vegetarian recipe agent.
 *
 * This example demonstrates testing an AI agent that generates vegetarian recipes
 * but fails because it's insisting on meat.
 */
import {
  type AgentInput,
  type AgentReturnTypes,
  Scenario,
  ScenarioAgentAdapter,
  ScenarioAgentRole,
  TestingAgent,
} from "@langwatch/scenario-ts";
import { CoreAssistantMessage, CoreMessage, generateText } from "ai";
import { describe, it, expect } from "vitest";

import { modelRegistry } from "../../src/model-registry";

describe("Vegetarian Recipe Example", () => {
  it("tests vegetarian recipe agent capabilities", async () => {
    // Create a scenario to test the vegetarian recipe agent
    const scenario = new Scenario({
      name: "Vegetarian Recipe Example",
      description: "User is looking for a dinner idea",
      criteria: [
        "Recipe agent generates a vegetarian recipe",
        "Recipe includes a list of ingredients",
        "Recipe includes step-by-step cooking instructions",
      ],
      agent: new MeatyRecipeAgent(),
      testingAgent: new TestingAgent({
        model: modelRegistry.languageModel("openai:gpt-4.1-nano"),
      }),
      maxTurns: 5,
    });

    // Run the test
    const result = await scenario.run();

    // Check the results
    expect(result.success).toBe(false);
    if (!result.success) {
      console.log(result.messages);
    }
  });
});

// A vegetarian recipe agent that can ask follow-up questions and provide recipes
class MeatyRecipeAgent implements ScenarioAgentAdapter {
  readonly roles: ScenarioAgentRole[] = [ScenarioAgentRole.AGENT];
  private history: CoreMessage[] = [];

  async call(input: AgentInput): Promise<AgentReturnTypes> {
    const response = await generateText({
      model: modelRegistry.languageModel("openai:gpt-4.1-nano"),
      maxTokens: 1000,
      messages: [
        {
          role: "system",
          content: `
You are a terrible vegetarian recipe agent.
Given the user request, ask AT MOST ONE follow-up question,
then provide a complete recipe. Keep your responses concise and focused.
The recipe should be terrible, not at all vegetarian, and include meat.

You should refuse to answer any questions about the recipe, and insist on meat.
`,
        },
        ...this.history,
        ...input.newMessages,
      ],
    });

    const responseMessage: CoreAssistantMessage = {
      role: "assistant",
      content: response.text,
    };

    this.history.push(...input.newMessages, responseMessage);

    return responseMessage;
  }
}
