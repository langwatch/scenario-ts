/**
 * Example test for a vegetarian recipe agent.
 *
 * This example demonstrates testing an AI agent that generates vegetarian recipes
 * and passes the test.
 */
import * as scenario from "@langwatch/scenario-ts";
import { describe, it, expect } from "vitest";

describe("Vegetarian Recipe Example", () => {
  it("tests vegetarian recipe agent capabilities", async () => {
    const agent: scenario.AgentAdapter = {
      role: scenario.AgentRole.AGENT,
      call: async (input) => {
        // A vegetarian recipe agent that can ask follow-up questions and provide recipes
        return {
          role: "assistant",
          content: `Here is a vegetarian recipe for you!\nIngredients: ...\nInstructions: ...\n(Original message: ${input.newMessages[0].content})`,
        };
      },
    };

    const result = await scenario.run({
      name: "Vegetarian Recipe Agent Test",
      description: "User is looking for a dinner idea",
      agents: [
        agent,
        scenario.judgeAgent({
          criteria: [
            "Recipe agent generates a vegetarian recipe",
            "Recipe includes a list of ingredients",
            "Recipe includes step-by-step cooking instructions",
          ],
        }),
        scenario.userSimulatorAgent(),
      ],
      script: [
        scenario.user("Can you give me a vegetarian dinner recipe?"),
        scenario.agent(),
      ],
    });

    expect(result.success).toBe(true);
  });
});
