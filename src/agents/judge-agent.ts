import { AgentInput, JudgeAgentAdapter, ScenarioAgentRole } from "../domain";

interface JudgeAgentConfig {
  criteria: string[];
}

export const judgeAgent = (cfg: JudgeAgentConfig) => {
  return {
    roles: [ScenarioAgentRole.JUDGE],
    criteria: cfg.criteria,

    call: async (input: AgentInput) => {
      return input;
    },
  } satisfies JudgeAgentAdapter;
};
