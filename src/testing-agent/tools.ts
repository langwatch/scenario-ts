import { Tool, tool } from "ai";
import { z } from "zod";

export class ToolDefinitionProvider {
  static getFinishTestTool(): Tool {
    return tool({
      description: "Complete the test with a final verdict",
      parameters: z
        .object({
          verdict: z
            .enum(["success", "failure", "inconclusive"])
            .describe("The final verdict of the test"),
          reasoning: z
            .string()
            .describe("Explanation of why this verdict was reached"),
          details: z
            .object({
              met_criteria: z
                .array(z.string())
                .describe("List of success criteria that have been met"),
              unmet_criteria: z
                .array(z.string())
                .describe("List of success criteria that have not been met"),
              triggered_failures: z
                .array(z.string())
                .describe("List of failure criteria that have been triggered"),
            })
            .describe("Detailed information about criteria evaluation"),
        })
        .strict(),
    });
  }
}
