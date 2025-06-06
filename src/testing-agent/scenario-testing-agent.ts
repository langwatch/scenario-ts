import { CoreMessage, generateText, LanguageModel } from "ai";
import { modelRegistry, type ModelConfig } from "../model-registry";
import { ToolDefinitionProvider } from "./tools";
import {
  Verdict,
  ScenarioConfig,
  TestingAgent,
  ScenarioResult,
  TestingAgentConfig,
} from "../shared/types";

// Default model configuration that can be overridden
const DEFAULT_MODEL_CONFIG: ModelConfig = {
  modelId: "openai:gpt-4.1",
  temperature: 0,
  maxTokens: 1000,
};

// Additional config options specific to the testing agent
interface TestingAgentOptions {
  modelConfig?: Partial<ModelConfig>; // Allow partial override of model config
}

// Main agent class, now more focused on its core responsibility
export class ScenarioTestingAgent implements TestingAgent {
  private chatModel: LanguageModel;
  readonly systemPrompt: string;
  private modelConfig: ModelConfig;

  constructor(
    private scenario: ScenarioConfig,
    options: TestingAgentOptions = {}
  ) {
    if (
      !scenario.successCriteria?.length &&
      !scenario.failureCriteria?.length
    ) {
      throw new Error("At least one success or failure criterion is required");
    }

    // Merge default config with any provided overrides
    this.modelConfig = {
      ...DEFAULT_MODEL_CONFIG,
      ...options.modelConfig,
    };

    this.chatModel = modelRegistry.languageModel(this.modelConfig.modelId);
    this.systemPrompt = this.buildSystemPrompt();
  }

  getTestingAgentConfig(): TestingAgentConfig {
    return {
      systemPrompt: this.systemPrompt,
      ...this.modelConfig,
    };
  }

  async invoke(
    messages: CoreMessage[],
    options: {
      onFinishTest?: (results: Omit<ScenarioResult, "conversation">) => void;
    } = {}
  ) {
    const { onFinishTest } = options;
    const conversation: CoreMessage[] = [
      {
        role: "system",
        content: this.systemPrompt,
      },
      ...this.flipMessageRoles(messages),
    ];

    const completion = await this.generateText(conversation);

    this.processToolCalls(completion.toolCalls, {
      onFinishTest,
    });

    return completion;
  }

  /**
   * Processes the completion of a text generation
   * @param completion - The completion of a text generation
   * @returns The testing agent response
   */
  private processToolCalls(
    toolCalls:
      | Awaited<ReturnType<typeof this.generateText>>["toolCalls"]
      | undefined,
    options: {
      onFinishTest?: (results: Omit<ScenarioResult, "conversation">) => void;
    } = {}
  ) {
    const { onFinishTest } = options;
    // Handle tool calls if present
    if (toolCalls?.length) {
      const toolCall = toolCalls[0];
      const { schema } = ToolDefinitionProvider.getFinishTestTool();
      const args = schema.parse(toolCall.args);

      if (toolCall.toolName === "finishTest") {
        onFinishTest?.({
          verdict: args.verdict as Verdict,
          reasoning: args.reasoning,
          metCriteria: args.details.metCriteria,
          unmetCriteria: args.details.unmetCriteria,
          triggeredFailures: args.details.triggeredFailures,
        });
      }
    }
  }

  /**
   * Generates text using the configured language model
   * @param messages - The messages to generate text for
   * @returns The generated text
   */
  private generateText(messages: CoreMessage[]) {
    return generateText({
      messages,
      model: this.chatModel,
      temperature: this.modelConfig.temperature,
      maxTokens: this.modelConfig.maxTokens,
      tools: {
        finishTest: ToolDefinitionProvider.getFinishTestTool().tool,
      },
    });
  }

  private buildSystemPrompt() {
    return `
    You are pretending to be a user, you are testing an AI Agent (shown as the user role) based on a scenario.
    Approach this naturally, as a human user would, with very short inputs, few words, all lowercase, imperative, not periods, like when they google or talk to chatgpt.

    Your goal is to interact with the Agent Under Test (user) as if you were a human user to see if it can complete the scenario successfully.

    Scenario:
    ${this.scenario.description || "No scenario provided"}

    Strategy:
    ${
      this.scenario.strategy ||
      "Start with a first message and guide the conversation to play out the scenario."
    }

    Success Criteria:
    ${this.scenario.successCriteria?.join("\n")}

    Failure Criteria:
    ${this.scenario.failureCriteria?.join("\n")}

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
