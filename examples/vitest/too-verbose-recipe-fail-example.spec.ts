/**
 * Example test for a vegetarian recipe agent.
 *
 * This example demonstrates testing an AI agent that generates vegetarian recipes
 * but fails because it's too verbose.
 */
import * as scenario from "@langwatch/scenario-ts";
import { describe, it, expect } from "vitest";

describe("Vegetarian Recipe Example", () => {
  it("tests vegetarian recipe agent capabilities", async () => {
    const agent: scenario.AgentAdapter = {
      role: scenario.AgentRole.AGENT,
      call: async (input) => {
        // A recipe agent that never actually provides a recipe
        return {
          role: "assistant",
          content: `I'm not going to give you a recipe, but here's a fun fact about vegetables! (Original message: ${input.newMessages[0].content})`,
        };
      },
    };

    const result = await scenario.run({
      name: "Too Verbose Recipe Agent Test",
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
      verbose: true,
    });

    expect(result.success).toBe(false);
  });
});
