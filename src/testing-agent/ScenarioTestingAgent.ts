import { modelRegistry } from "../modelRegistry";
import { TestingAgentResponse, TestingAgentResponseType } from "../types";
import { CoreMessage, generateText, LanguageModel } from "ai";
import { ToolDefinitionProvider } from "./tools";

const DEFAULT_MODEL: Parameters<typeof modelRegistry.languageModel>[0] =
  "openai:gpt-4o-mini";

interface ScenarioTestingAgentConfig {
  description: string;
  strategy: string;
  successCriteria?: string[];
  failureCriteria?: string[];
  maxTurns?: number;
}
// Main agent class, now more focused on its core responsibility
export class ScenarioTestingAgent {
  private chatModel: LanguageModel;
  private systemPrompt: string;

  constructor(private config: ScenarioTestingAgentConfig) {
    if (!config.successCriteria?.length && !config.failureCriteria?.length) {
      throw new Error("At least one success or failure criterion is required");
    }

    this.chatModel = modelRegistry.languageModel(DEFAULT_MODEL);
    this.systemPrompt = this.buildSystemPrompt();
  }

  async invoke(messages: CoreMessage[]): Promise<TestingAgentResponse> {
    const completion = await generateText({
      messages: [
        {
          role: "system",
          content: this.systemPrompt,
        },
        ...this.flipMessageRoles(messages),
      ],
      model: this.chatModel,
      temperature: 0,
      maxTokens: 1000,
      tools: {
        finishTest: ToolDefinitionProvider.getFinishTestTool().tool,
      },
    });

    // Handle tool calls if present
    if (completion.toolCalls?.length) {
      const toolCall = completion.toolCalls[0];
      const { schema } = ToolDefinitionProvider.getFinishTestTool();
      const args = schema.parse(toolCall.args);
      if (toolCall.toolName === "finishTest") {
        console.log("FINISH TEST");
        return {
          type: TestingAgentResponseType.FinishTest,
          success: args.verdict === "success",
          reasoning: args.reasoning,
          metCriteria: args.details.metCriteria,
          unmetCriteria: args.details.unmetCriteria,
          triggeredFailures: args.details.triggeredFailures,
        };
      }
    }

    // Regular message response
    return {
      type: TestingAgentResponseType.Message,
      message: completion.text,
    };
  }

  private buildSystemPrompt() {
    return `
    You are pretending to be a user, you are testing an AI Agent (shown as the user role) based on a scenario.
    Approach this naturally, as a human user would, with very short inputs, few words, all lowercase, imperative, not periods, like when they google or talk to chatgpt.

    Your goal is to interact with the Agent Under Test (user) as if you were a human user to see if it can complete the scenario successfully.

    Scenario:
    ${this.config.description || "No scenario provided"}

    Strategy:
    ${this.config.strategy || "Start with a first message and guide the conversation to play out the scenario."}

    Success Criteria:
    ${this.config.successCriteria?.join("\n")}

    Failure Criteria:
    ${this.config.failureCriteria?.join("\n")}

    Execution Flow:
    1. Generate the first message to start the scenario
    2. After the Agent Under Test (user) responds, generate the next message to send to the Agent Under Test, keep repeating step 2 until criterias match
    3. If the test should end, use the finish_test tool to determine if success or failure criteria have been met

    Rules:
    1. Test should end immediately if a failure criteria is triggered
    2. Test should continue until all success criteria have been met
    3. DO NOT make any judgment calls that are not explicitly listed in the success or failure criteria, withhold judgement if necessary
    4. DO NOT carry over any requests yourself, YOU ARE NOT the assistant today, wait for the user to do it
    `;
  }

  // Flip message roles to simulate a conversation between a user and an assistant
  private flipMessageRoles(messages: CoreMessage[]): CoreMessage[] {
    return messages.map((message) => {
      // Only flip user <-> assistant, leave others unchanged
      if (message.role === "user") {
        // User -> Assistant
        return {
          role: "assistant",
          content: typeof message.content === "string" ? message.content : "", // Only flip if content is string
        } as const;
      }
      if (message.role === "assistant") {
        // Assistant -> User
        return {
          role: "user",
          content: typeof message.content === "string" ? message.content : "", // Only flip if content is string
        } as const;
      }
      // Leave system/tool messages unchanged
      return message;
    });
  }
}
