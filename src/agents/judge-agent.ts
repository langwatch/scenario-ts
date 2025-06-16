import { generateText, CoreMessage, ToolCall } from "ai";
import { AgentInput, JudgeAgentAdapter, ScenarioAgentRole } from "../domain";
import { ScenarioData, TestingAgentConfig, FinishTestArgs } from "./types";
import { criterionToParamName, messageRoleReversal } from "./utils";
import { ScenarioResult } from "../domain/core/execution";

interface JudgeAgentConfig extends TestingAgentConfig {
  criteria: string[];
}

function extractScenarioData(input: AgentInput): ScenarioData {
  const scenarioState = input.scenarioState as unknown as { scenario?: ScenarioData };
  return scenarioState.scenario || {};
}

function buildSystemPrompt(scenario: ScenarioData): string {
  const criteriaList = scenario.criteria
    ?.map((criterion, idx) => `${idx + 1}. ${criterion}`)
    .join("\n") || "No criteria provided";

  return `
<role>
You are the judge for an AI Agent test scenario. Your job is to evaluate the conversation against the criteria below and return a strict, objective verdict.
</role>

<goal>
Your goal is to determine if the Agent Under Test has met all the scenario criteria, based on the conversation.
</goal>

<scenario>
${scenario.description || "No scenario description"}
</scenario>

<criteria>
${criteriaList}
</criteria>

<execution_flow>
1. Review the conversation and compare it to the criteria
2. For each criterion, decide if it was met (true), not met (false), or inconclusive
3. Use the finish_test tool to submit your verdict
</execution_flow>

<rules>
1. Only judge based on the criteria provided
2. If any "should NOT" criteria are violated, the test fails immediately
3. If you cannot determine the outcome for a criterion, mark it as inconclusive
4. Be objective and strict in your evaluation
5. Use the finish_test tool to submit your final verdict
</rules>
`.trim();
}

function buildFinishTestTool(scenario: ScenarioData & { criteria?: string[] }) {
  const criteria = scenario.criteria || [];
  const criteriaNames = criteria.map(criterionToParamName);
  const criteriaProperties = Object.fromEntries(
    criteria.map((criterion, idx) => [
      criteriaNames[idx],
      {
        enum: [true, false, "inconclusive"],
        description: criterion,
      },
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
          description: "Strict verdict for each criterion",
        },
        reasoning: {
          type: "string" as const,
          description: "Explanation of what the final verdict should be",
        },
        verdict: {
          type: "string" as const,
          enum: ["success", "failure", "inconclusive"],
          description: "The final verdict of the test",
        },
      },
      required: ["criteria", "reasoning", "verdict"],
      additionalProperties: false,
    },
  };
}

export const judgeAgent = (cfg: JudgeAgentConfig) => {
  return {
    roles: [ScenarioAgentRole.JUDGE],
    criteria: cfg.criteria,

    call: async (input: AgentInput) => {
      const scenario = extractScenarioData(input);
      const systemPrompt = buildSystemPrompt(scenario);
      const messages: CoreMessage[] = [
        { role: "system", content: systemPrompt },
        ...input.messages,
        ...input.newMessages,
      ];

      const reversedMessages = messageRoleReversal(messages);
      const tools = { finish_test: buildFinishTestTool(scenario) };
      const toolChoice = "required";
      const completion = await generateText({
        model: cfg.model,
        messages: reversedMessages,
        temperature: cfg.temperature ?? 0.0,
        maxTokens: cfg.maxTokens,
        tools,
        toolChoice,
      });

      // Prefer tool call, fallback to JSON
      let args: FinishTestArgs | undefined;
      if (completion.toolCalls?.length) {
        const toolCall = completion.toolCalls[0] as ToolCall<string, FinishTestArgs>;
        if (toolCall.toolName === "finish_test") {
          args = toolCall.args;
        }
      }

      if (!args) {
        try {
          args = JSON.parse(completion.text);
        } catch {
          return {
            success: false,
            messages: input.messages,
            reasoning: "JudgeAgent: Failed to parse LLM output as JSON or tool call",
            passedCriteria: [],
            failedCriteria: scenario.criteria || [],
          } satisfies ScenarioResult;
        }
      }
      if (!args) {
        return {
          success: false,
          messages: input.messages,
          reasoning: "JudgeAgent: LLM output was undefined after parsing",
          passedCriteria: [],
          failedCriteria: scenario.criteria || [],
        } satisfies ScenarioResult;
      }

      const verdict = args.verdict || "inconclusive";
      const reasoning = args.reasoning || "No reasoning provided";
      const criteria = args.criteria || {};
      const criteriaValues = Object.values(criteria);
      const passedCriteria = (scenario.criteria || []).filter((_, i) => criteriaValues[i] === true);
      const failedCriteria = (scenario.criteria || []).filter((_, i) => criteriaValues[i] === false);

      return {
        success: verdict === "success",
        messages: input.messages,
        reasoning,
        passedCriteria,
        failedCriteria,
      } satisfies ScenarioResult;
    },
  } satisfies JudgeAgentAdapter;
};
