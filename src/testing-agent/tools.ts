import { tool } from "ai";
import { z } from "zod";
import { Verdict } from "../shared/types";
/**
 * Provides tool definitions for the testing agent to use during scenario evaluation.
 *
 * This class contains static methods that return tool definitions with their
 * associated schemas, making it easy to create consistent tools across the testing system.
 */
export class ToolDefinitionProvider {
  /**
   * Creates a tool that allows the testing agent to complete a test with a final verdict.
   *
   * This tool is used to signal the end of a test scenario and provide detailed
   * information about why a particular verdict was reached, including which
   * success criteria were met or unmet and which failure criteria were triggered.
   *
   * @returns An object containing the Zod schema and the tool definition
   */
  static getFinishTestTool() {
    const parameters = z
      .object({
        verdict: z
          .nativeEnum(Verdict)
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
