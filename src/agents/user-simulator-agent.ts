import { generateText, CoreMessage } from "ai";
import { AgentInput, ScenarioAgentRole, UserSimulatorAgentAdapter } from "../domain";
import { ScenarioData, TestingAgentConfig } from "./types";
import { messageRoleReversal } from "./utils";

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
You are pretending to be a user, testing an AI Agent based on a scenario.
Approach this naturally, as a human user would, with very short inputs, few words, all lowercase, imperative, no periods, like when they google or talk to chatgpt.
</role>

<goal>
Your goal is to interact with the Agent Under Test as if you were a human user to see if it can complete the scenario successfully.
</goal>

<scenario>
${scenario.description || "No scenario description"}
</scenario>

<criteria>
${criteriaList}
</criteria>

<execution_flow>
1. Generate the first message to start the scenario
2. After the Agent Under Test responds, generate the next message, keep repeating until criteria match
3. If the test should end, stop the test and wait for a judge to evaluate
</execution_flow>
`.trim();
}

export const userSimulatorAgent = (config: TestingAgentConfig) => {
  return {
    roles: [ScenarioAgentRole.USER],

    call: async (input: AgentInput) => {
      const scenario = extractScenarioData(input);
      const systemPrompt = buildSystemPrompt(scenario);
      const messages: CoreMessage[] = [
        { role: "system", content: systemPrompt },
        ...input.messages,
        ...input.newMessages,
      ];

      const reversedMessages = messageRoleReversal(messages);
      const completion = await generateText({
        model: config.model,
        messages: reversedMessages,
        temperature: config.temperature ?? 0.0,
        maxTokens: config.maxTokens,
      });

      const messageContent = completion.text;
      if (!messageContent) {
        throw new Error("No response content from LLM");
      }

      return { role: "user", content: messageContent } satisfies CoreMessage;
    },
  } satisfies UserSimulatorAgentAdapter;
};
