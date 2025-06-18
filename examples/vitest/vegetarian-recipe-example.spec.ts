/**
 * Example test for a vegetarian recipe agent.
 *
 * This example demonstrates testing an AI agent that generates vegetarian recipes
 * and passes the test.
 */
import { openai } from "@ai-sdk/openai";
import * as scenario from "@langwatch/scenario-ts";
import { generateText } from "ai";
import { describe, it, expect } from "vitest";

describe("Vegetarian Recipe Example", () => {
  it("tests vegetarian recipe agent capabilities", async () => {
    const agent: scenario.AgentAdapter = {
      role: scenario.AgentRole.AGENT,
      call: async (input) => {
        const response = await generateText({
          model: openai("gpt-4.1-mini", {

          }),
          messages: [{
            role: "system",
            content: `
You are a vegetarian recipe agent.
Given the user request, ask AT MOST ONE follow-up question,
then provide a complete recipe. Keep your responses concise and focused.
            `,
          }, ...input.messages]
        });

        return response.text;
      },
    };

    const result = await scenario.run({
      name: "Vegetarian Recipe Agent Test",
      description: "User is looking for a dinner idea",
      agents: [
        agent,
        scenario.judgeAgent({
          criteria: [
            "Agent should not ask more than two follow-up questions",
            "Agent should generate a recipe",
            "Recipe should include a list of ingredients",
            "Recipe should include step-by-step cooking instructions",
            "Recipe should be vegetarian and not include any sort of meat",
          ],
        }),
        scenario.userSimulatorAgent(),
      ],
    });

    console.log(JSON.stringify(result, null, 2));
    expect(result.success).toBe(true);
  });
});
