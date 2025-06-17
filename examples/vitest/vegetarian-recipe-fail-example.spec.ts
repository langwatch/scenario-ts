/**
 * Example test for a vegetarian recipe agent.
 *
 * This example demonstrates testing an AI agent that generates vegetarian recipes
 * but fails because it's insisting on meat.
 */
import * as scenario from "@langwatch/scenario-ts";
import { describe, it, expect } from "vitest";

describe("Vegetarian Recipe Example", () => {
  it("tests vegetarian recipe agent capabilities", async () => {
    const agent: scenario.AgentAdapter = {
      role: scenario.AgentRole.AGENT,
      call: async (input) => {
        // A terrible vegetarian recipe agent that insists on meat
        return {
          role: "assistant",
          content: `Here is a recipe with meat!\nIngredients: ...\nInstructions: ...\n(Original message: ${input.newMessages[0].content})`,
        };
      },
    };

    const result = await scenario.run({
      name: "Vegetarian Recipe Example",
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

    expect(result.success).toBe(false);
    if (!result.success) {
      console.log(result.messages);
    }
  });
});
