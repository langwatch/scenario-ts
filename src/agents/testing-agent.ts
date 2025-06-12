import {
  generateText,
  CoreMessage,
  ToolCall,
  CoreUserMessage,
} from "ai";
import { generate } from "xksuid";
import {
  ScenarioAgentAdapter,
  ScenarioAgentRole,
  AgentInput,
  AgentReturnTypes,
  ScenarioResult,
} from "../domain";
import { FinishTestArgs, ScenarioData, TestingAgentConfig } from "./types";
import { criterionToParamName, messageRoleReversal } from "./utils";
import { ScenarioExecutionState } from "../scenario-execution/scenario-execution-state";
import { Logger } from "../utils/logger";

const finishTestToolName = "finish_test";

const generateThreadId = () => {
  return `thread_${generate()}`;
};

/**
 * The Testing Agent that interacts with the agent under test.
 *
 * This agent is responsible for:
 * 1. Generating messages to send to the agent based on the scenario
 * 2. Evaluating responses against success/failure criteria
 * 3. Determining when to end the test and return a result
 */
export class TestingAgent extends ScenarioAgentAdapter {
  readonly roles: ScenarioAgentRole[] = [ScenarioAgentRole.USER, ScenarioAgentRole.JUDGE];
  private readonly logger: Logger;

  protected readonly config: TestingAgentConfig;
  private readonly systemPrompt: string;

  constructor(config: TestingAgentConfig, optionalInput?: AgentInput) {
    const input = optionalInput ?? {
      threadId: generateThreadId(),
      context: {},
      messages: [],
      newMessages: [],
      requestedRole: ScenarioAgentRole.USER,
      scenarioState: new ScenarioExecutionState(),
    } as AgentInput;

    super(input);

    const scenario = this.extractScenarioData(input);
    this.config = config;
    this.systemPrompt = this.buildSystemPrompt(scenario);
    this.logger = Logger.create(`TestingAgent:${this.config.name || "default"}`);
  }

  async call(input: AgentInput): Promise<AgentReturnTypes> {
    const scenario = this.extractScenarioData(input);
    const { isFirstMessage, isLastMessage } = this.getMessageContext(input, scenario);

    const enforceJudgement = input.requestedRole === ScenarioAgentRole.JUDGE;
    const hasCriteria = scenario.criteria.length > 0;
    if (enforceJudgement && !hasCriteria) {
      return {
        success: false,
        messages: input.messages,
        reasoning: "TestingAgent was called as a judge, but it has no criteria to judge against",
        passedCriteria: [],
        failedCriteria: [],
      }
    }

    const tools = (!isFirstMessage || enforceJudgement) && hasCriteria
      ? { [finishTestToolName]: this.buildFinishTestTool(scenario) }
      : void 0;
    const toolChoice = (isLastMessage || enforceJudgement) && hasCriteria
      ? "required"
      : void 0;

    try {
      const completion = await generateText({
        model: this.config.model,
        messages: this.buildMessages(input, isLastMessage),
        temperature: this.config.temperature ?? 0.0,
        maxTokens: this.config.maxTokens,
        tools,
        toolChoice,
      });

      return this.processCompletion(completion, input, scenario);

    } catch (error) {
      throw new Error(`LLM call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractScenarioData(input: AgentInput): ScenarioData & { criteria: string[] } {
    // Extract scenario data from state with proper fallbacks
    const scenarioState = input.scenarioState as unknown as {
      scenario?: ScenarioData
    };

    const scenario = scenarioState.scenario || {};

    return {
      description: scenario.description || "No scenario description",
      criteria: scenario.criteria || [],
      maxTurns: scenario.maxTurns || 10
    };
  }

  private buildMessages(input: AgentInput, isLastMessage: boolean): CoreMessage[] {
    const messages: CoreMessage[] = [
      { role: "system", content: this.systemPrompt },
      { role: "assistant", content: "Hello, how can I help you today?" },
      ...input.messages,
    ];

    if (isLastMessage) {
      messages.push({
        role: "user",
        content: this.buildFinishTestPrompt()
      });
    }

    // User to assistant role reversal
    // LLM models are biased to always be the assistant not the user, so we need to do this reversal otherwise models like GPT 4.5 is
    // super confused, and Claude 3.7 even starts throwing exceptions.
    return messageRoleReversal(messages);
  }

  private buildSystemPrompt(scenario: ScenarioData): string {
    const criteriaList = scenario.criteria
      ?.map((criterion, idx) => `${idx + 1}. ${criterion}`)
      .join("\n") || "No criteria provided";

    return `
<role>
You are pretending to be a user, testing an AI Agent based on a scenario.
Approach this naturally, as a human user would, with very short inputs, few words, all lowercase, imperative, no periods, like when they google or talk to chatgpt.
</role>

<goal>
Your goal is to interact with the Agent Under Test as if you were a human user to see if it can complete the scenario successfully.
</goal>

<scenario>
${scenario.description}
</scenario>

<criteria>
${criteriaList}
</criteria>

<execution_flow>
1. Generate the first message to start the scenario
2. After the Agent Under Test responds, generate the next message, keep repeating until criteria match
3. If the test should end, use the finish_test tool to determine if all criteria have been met
</execution_flow>

<rules>
1. Test should end immediately if a criteria mentioning something the agent should NOT do is met
2. Test should continue until all scenario goals have been met
3. DO NOT make judgment calls not explicitly listed in the criteria
4. DO NOT carry out requests yourself, YOU ARE NOT the assistant today
</rules>`.trim();
  }

  private buildFinishTestPrompt(): string {
    return `
System:

<finish_test>
This is the last message, conversation has reached maximum turns, give your final verdict.
If you don't have enough information to make a verdict, say inconclusive with max turns reached.
</finish_test>
`.trim();
  }

  private getMessageContext(input: AgentInput, scenario: ScenarioData) {
    return {
      isFirstMessage: input.messages.length === 0,
      isLastMessage: input.scenarioState.turn !== null && input.scenarioState.turn >= (scenario.maxTurns || 10)
    };
  }

  private buildFinishTestTool(scenario: ScenarioData & { criteria: string[] }) {
    const criteriaNames = scenario.criteria.map(criterionToParamName);

    const criteriaProperties = Object.fromEntries(
      scenario.criteria.map((criterion, idx) => [
        criteriaNames[idx],
        {
          enum: [true, false, "inconclusive"],
          description: criterion
        }
      ])
    );

    return {
      description: "Complete the test with a final verdict",
      parameters: {
        type: "object" as const,
        properties: {
          criteria: {
            type: "object" as const,
            properties: criteriaProperties,
            required: criteriaNames,
            additionalProperties: false,
            description: "Strict verdict for each criterion"
          },
          reasoning: {
            type: "string" as const,
            description: "Explanation of what the final verdict should be"
          },
          verdict: {
            type: "string" as const,
            enum: ["success", "failure", "inconclusive"],
            description: "The final verdict of the test"
          }
        },
        required: ["criteria", "reasoning", "verdict"],
        additionalProperties: false
      }
    };
  }

  private processCompletion(
    completion: Awaited<ReturnType<typeof generateText>>,
    input: AgentInput,
    scenario: ScenarioData & { criteria: string[] }
  ): AgentReturnTypes {
    if (completion.toolCalls?.length) {
      const toolCall = completion.toolCalls[0];
      if (toolCall.toolName === finishTestToolName) {
        return this.processFinishTestCall(toolCall, input, scenario);
      }
    }

    const messageContent = completion.text;
    if (!messageContent) {
      throw new Error("No response content from LLM");
    }

    return { role: "user", content: messageContent } as CoreUserMessage;
  }

    private processFinishTestCall(
    toolCall: ToolCall<string, FinishTestArgs>,
    input: AgentInput,
    scenario: ScenarioData & { criteria: string[] }
  ): ScenarioResult {
    try {
      const args = toolCall.args;
      const verdict = args.verdict || "inconclusive";
      const reasoning = args.reasoning || "No reasoning provided";
      const criteria = args.criteria || {};

      const criteriaValues = Object.values(criteria);

      const passedCriteria = scenario.criteria.filter((_, idx) => {
        const criterionResult = criteriaValues[idx];
        return criterionResult === true;
      });

      const failedCriteria = scenario.criteria.filter((_, idx) => {
        const criterionResult = criteriaValues[idx];
        return criterionResult === false;
      });

      return {
        success: verdict === "success",
        messages: input.messages,
        reasoning,
        passedCriteria,
        failedCriteria,
      };

    } catch (error) {
      this.logger.error("failed to parse tool call arguments", error);

      return {
        success: false,
        messages: input.messages,
        reasoning: "Failed to parse test results",
        passedCriteria: [],
        failedCriteria: scenario.criteria,
      };
    }
  }
}
