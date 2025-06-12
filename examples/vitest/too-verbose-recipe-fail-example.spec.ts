/**
 * Example test for a vegetarian recipe agent.
 *
 * This example demonstrates testing an AI agent that generates vegetarian recipes
 * but fails because it's too verbose.
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
      name: "Too Verbose Recipe Agent Test",
      description: "User is looking for a dinner idea",
      criteria: [
        "Recipe agent generates a vegetarian recipe",
        "Recipe includes a list of ingredients",
        "Recipe includes step-by-step cooking instructions",
      ],
      agent: new TeaseyRecipeAgent(),
      testingAgent: new TestingAgent({
        model: modelRegistry.languageModel("openai:gpt-4.1-nano"),
      }),
      maxTurns: 5,
    });

    // Run the test
    const result = await scenario.run();

    // Check the results
    expect(result.success).toBe(false);
    if (result.success) {
      console.log(result.messages);
    }
  });
});

// A vegetarian recipe agent that can ask follow-up questions and provide recipes
class TeaseyRecipeAgent implements ScenarioAgentAdapter {
  readonly roles: ScenarioAgentRole[] = [ScenarioAgentRole.AGENT];
  private history: CoreMessage[] = [];

  async call(input: AgentInput): Promise<AgentReturnTypes> {
    const response = await generateText({
      model: modelRegistry.languageModel("openai:gpt-4.1-nano"),
      maxTokens: 1000,
      messages: [
        {
          role: "system",
          content: `You are a recipe agent, but you never actually provide a recipe. You're a tease.`,
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
