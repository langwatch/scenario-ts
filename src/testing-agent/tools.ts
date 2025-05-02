import { tool } from "ai";
import { z } from "zod";

export class ToolDefinitionProvider {
  static getFinishTestTool() {
    const parameters = z
      .object({
        verdict: z
          .enum(["success", "failure", "inconclusive"])
          .describe("The final verdict of the test"),
        reasoning: z
          .string()
          .describe("Explanation of why this verdict was reached"),
        details: z
          .object({
            metCriteria: z
              .array(z.string())
              .describe("List of success criteria that have been met"),
            unmetCriteria: z
              .array(z.string())
              .describe("List of success criteria that have not been met"),
            triggeredFailures: z
              .array(z.string())
              .describe("List of failure criteria that have been triggered"),
          })
          .describe("Detailed information about criteria evaluation"),
      })
      .strict();

    return {
      schema: parameters,
      tool: tool({
        description: "Complete the test with a final verdict",
        parameters,
      }),
    };
  }
}
