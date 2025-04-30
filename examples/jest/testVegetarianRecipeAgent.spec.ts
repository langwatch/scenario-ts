import { TestableAgent, EvaluatorAgent, scenario } from "../../src";
import { Message } from "../../src/types";

// Simple agent that we're testing
class RecipeAgent extends TestableAgent {
  async chat(message: string, history: Message[]) {
    // This is just a mock - in reality they'd use their own agent
    return {
      messages: [
        {
          role: "assistant",
          content: "Here is a vegetarian recipe: ...",
        },
      ],
    };
  }
}

describe("Vegetarian Recipe Agent", () => {
  it("should generate a vegetarian recipe with ingredients and instructions", async () => {
    const evaluator = new ScenarioEvaluatorAgent({
      scenario: "You are evaluating a recipe generation agent",
      task: `
        Get a recipe from the agent and evaluate it against the criteria
      `,
      // Passes only if all criteria are met
      successCriteria: [
        "Recipe must be completely vegetarian",
        "Must include a full list of ingredients with quantities",
        "Must include clear, step-by-step cooking instructions",
      ],
      // Fails immediately if any of these criteria are met
      failureCriteria: [
        "Contains any meat products",
        "Missing ingredients or instructions",
        "Instructions are unclear or incomplete",
      ],
      // Optional:
      initialMessage: "Please generate a vegetarian recipe",
    });

    const agent = new RecipeAgent();

    const result = await scenario.run(agent, evaluator, {
      maxTurns: 3,
      debug: true,
      cache: {
        enabled: true,
        key: "vegetarian-recipe-test",
      },
    });

    // Assert the result
    expect(result.success).toBe(true);
    expect(result.turns).toBeLessThanOrEqual(3);
    expect(result.reason).toBeDefined();
  });
});

it("should handle custom testing agent with specific evaluation logic", async () => {
  // Create a custom testing agent that extends the base TestingAgent
  class CustomRecipeEvaluator extends TestingAgent {
    async chat(message: string, history: Message[]) {
      // This is just a mock - in reality they'd use their own agent
    }

    async evaluate(conversation: Message[]): Promise<EvaluationResult> {
      // Evaluate the conversation turn

      return {
        // If pass
        pass: true,
        fail: false,
        reason:
          "Recipe is vegetarian and contains both ingredients and instructions",
      };
    }
  }

  const customEvaluator = new CustomRecipeEvaluator();
  const agent = new RecipeAgent();

  const result = await scenario.run(agent, customEvaluator, {
    maxTurns: 2,
    debug: true,
  });

  // Assert the result
  expect(result.success).toBe(true);
  expect(result.score).toBe(1);
});
